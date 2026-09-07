import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ApiPayload } from '../common/api-response';
import { PG_POOL, withTransaction } from '../common/database.module';
import { DailyLogBody, DailyLogsService } from './daily-logs.service';
import { DoseLogsService } from './dose-logs.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { DoseLogDto, NO_EFFECT } from './dto/dose-log.dto';
import { ListLogsDto } from './dto/list-logs.dto';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * The longest span the calendar may ask for at once.
 *
 * A year and a day, which is a month view stepped back through twelve months
 * in one go - generous for the screen that exists, and a ceiling on what one
 * request can ask this file store to walk.
 */
const MAX_RANGE_DAYS = 366;

/** What `POST /logs` hands back - the day, echoed for the calendar to mark. */
export interface DailyLogResult {
  log_date: string;
}

/**
 * Where a day stands, in the client's own words.
 *
 * Only `logged` is ever returned today: a day arrives in one request, whole, so
 * a row in the file is by definition a finished day. `in-progress` is here
 * because the calendar already draws it and the day the app starts saving
 * part-filled logs, this is where that answer will come from - not because
 * anything produces it yet.
 */
export type DayStatus = 'logged' | 'in-progress';

/** What `GET /logs` hands back: day statuses keyed by `YYYY-MM-DD`. */
export interface DayStatusesResult {
  statuses: Record<string, DayStatus>;
}

/**
 * "6 September 2026" - how a day is named back to the user.
 *
 * Spelled out rather than echoed as `2026-09-06`, which is a key, not a date
 * anyone reads out loud.
 */
function describeDay(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * `YYYY-MM-DD`, or null when those numbers are not a real day.
 *
 * The DTO's pattern only proves the shape: 2026-02-31 matches it and does not
 * exist. Building the date and reading the parts back is what catches that -
 * the same check `parseDob` makes in the profile service.
 */
function parseDayKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Today's `YYYY-MM-DD` on the user's own clock.
 *
 * Their offset, not the server's: a server in London and a user in Delhi
 * disagree about what day it is for five and a half hours out of every
 * twenty-four, and the day the user lived is the one being logged. Shifting the
 * moment by the offset and then reading its UTC parts gives their local date.
 */
function todayForUser(utcOffsetMinutes: number): string {
  const shifted = new Date(Date.now() + utcOffsetMinutes * MINUTE_MS);
  return shifted.toISOString().slice(0, 10);
}

/** Null and "not sent" both mean the question was not answered. */
function answered(value: unknown): boolean {
  return value !== null && value !== undefined;
}

/**
 * The body minus its doses - the seam between the one request the client sends
 * and the two files it lands in.
 *
 * Written as a delete rather than by listing the day's fields out again, so
 * adding a question to the day means editing the DTO and nothing else.
 */
function withoutDoses(dto: CreateDailyLogDto): DailyLogBody {
  const day: Partial<CreateDailyLogDto> = { ...dto };
  delete day.doses;
  return day as DailyLogBody;
}

/** The file only ever holds null, never an absent key - see `toStoredDay`. */
function orNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

@Injectable()
export class LogsService {
  constructor(
    private dailyLogs: DailyLogsService,
    private doseLogs: DoseLogsService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Saves a whole day in one write.
   *
   * One day per request, not one section per request: a half-saved day is worse
   * than an unsaved one - it would show as logged on the calendar while missing
   * its doses - so the day is checked through and written in a single go, or
   * rejected whole.
   *
   * `userId` is passed apart from the body because it comes from somewhere
   * else: the controller reads it off the verified token, so it is the one
   * value here the caller cannot choose.
   */
  async createDailyLog(
    userId: string,
    dto: CreateDailyLogDto,
  ): Promise<ApiPayload<DailyLogResult>> {
    this.assertDayIsLoggable(dto);
    this.assertDosesMatchPlan(dto);
    dto.doses.forEach((dose, index) => {
      this.assertDoseConsistent(dose, index);
    });
    this.assertNightConsistent(dto);

    // One transaction for the whole day. The doses replace what the day held
    // before, so between the two writes the day exists with the wrong doses
    // against it - and a failure in the middle would leave it that way for
    // good. Either the corrected day and all of its doses land, or none of it
    // does and the previous version stands untouched.
    const { saved, existed } = await withTransaction(this.pool, async (db) => {
      // Read before the write, so the message can tell the user which of the
      // two things just happened rather than guessing. Inside the transaction,
      // so it cannot disagree with what the write then does.
      const existing = await this.dailyLogs.findByUserAndDate(
        userId,
        dto.log_date,
        db,
      );

      // The day first, because it is what mints the id, the account and the
      // two timestamps that its doses are then stamped with - a dose row
      // cannot say which day it belongs to until that day has one.
      const day = await this.dailyLogs.save(userId, this.toStoredDay(dto), db);
      await this.doseLogs.replaceForDay(
        day.id,
        day.user_id,
        day.log_date,
        this.toStoredDoses(dto.doses),
        { created_at: day.created_at, updated_at: day.updated_at },
        db,
      );

      return { saved: day, existed: existing !== undefined };
    });

    const day = describeDay(saved.log_date);
    return {
      message: existed
        ? `Your log for ${day} has been updated.`
        : `Your log for ${day} is saved.`,
      data: { log_date: saved.log_date },
    };
  }

  /**
   * Which days in a range already carry a log.
   *
   * A map keyed by day rather than a list of rows, because that is the question
   * the calendar is asking: it draws a cell and needs to know what mark goes
   * under it, and a list would only make it build this map itself. The days
   * with nothing to say are absent rather than listed as empty - a month is
   * mostly days that haven't been logged, and naming each one would make the
   * answer thirty times bigger to say nothing.
   */
  async listDayStatuses(
    userId: string,
    query: ListLogsDto,
  ): Promise<ApiPayload<DayStatusesResult>> {
    this.assertRangeIsSensible(query);

    const logs = await this.dailyLogs.findByUserInRange(
      userId,
      query.from,
      query.to,
    );
    const statuses: Record<string, DayStatus> = {};
    logs.forEach((log) => {
      statuses[log.log_date] = 'logged';
    });

    const count = logs.length;
    return {
      message: `You have logged ${count} ${count === 1 ? 'day' : 'days'} in this period.`,
      data: { statuses },
    };
  }

  /** Both ends have to be real days, in that order, and not too far apart. */
  private assertRangeIsSensible(query: ListLogsDto): void {
    const from = parseDayKey(query.from);
    const to = parseDayKey(query.to);

    if (!from || !to) {
      throw new BadRequestException('Choose a real date range to show.');
    }
    if (query.from > query.to) {
      throw new BadRequestException(
        'The first day must come before the last day.',
      );
    }
    if ((to.getTime() - from.getTime()) / DAY_MS >= MAX_RANGE_DAYS) {
      throw new BadRequestException(
        'That is more than a year at once. Ask for a shorter period.',
      );
    }
  }

  /**
   * The day's own answers, with every unanswered question written down as null
   * and the doses left behind for the file that holds them.
   *
   * `null` and a missing key look the same to a caller reading the file back,
   * but only one of them says "this was asked and the answer was nothing". The
   * profile does the same thing for the same reason.
   */
  private toStoredDay(dto: CreateDailyLogDto): DailyLogBody {
    return {
      ...withoutDoses(dto),
      timezone: orNull(dto.timezone),
      other_meds: orNull(dto.other_meds),
      med_side_effects: orNull(dto.med_side_effects),
      night_wakeup_count: orNull(dto.night_wakeup_count),
      night_symptoms: orNull(dto.night_symptoms),
      night_symptoms_troublesome_flag: orNull(
        dto.night_symptoms_troublesome_flag,
      ),
    };
  }

  /** The same treatment for each dose, whose nulls are the bulk of them. */
  private toStoredDoses(doses: DoseLogDto[]): DoseLogDto[] {
    return doses.map((dose) => ({
      ...dose,
      peak_effect_time: orNull(dose.peak_effect_time),
      pal_pct: orNull(dose.pal_pct),
      at_pal_dl_affected_flag: orNull(dose.at_pal_dl_affected_flag),
      dysky_flag: orNull(dose.dysky_flag),
      dysky_duration: orNull(dose.dysky_duration),
      dysky_body_part: orNull(dose.dysky_body_part),
      dysky_dl_affected_flag: orNull(dose.dysky_dl_affected_flag),
      med_wear_off_time: orNull(dose.med_wear_off_time),
      off_period_dl_affected_flag: orNull(dose.off_period_dl_affected_flag),
    }));
  }

  /** The day has to exist, and it has to have happened. */
  private assertDayIsLoggable(dto: CreateDailyLogDto): void {
    if (!parseDayKey(dto.log_date)) {
      throw new BadRequestException('Choose a real date to log.');
    }
    if (dto.log_date > todayForUser(dto.utc_offset_minutes)) {
      throw new BadRequestException(
        'You cannot log a day that has not happened yet.',
      );
    }
  }

  /**
   * How many doses were described has to match how many the day said there
   * were, and they have to run forwards.
   *
   * The client stamps a day's readings with one clock that only ever moves
   * forwards - that is how a dose taken at 11pm and wearing off after midnight
   * gets the right date - so times that go backwards mean the chain was built
   * wrong, not that the day was odd.
   */
  private assertDosesMatchPlan(dto: CreateDailyLogDto): void {
    if (dto.doses.length !== dto.dose_count) {
      throw new BadRequestException(
        `You said you took your medicine ${dto.dose_count} times, but ${dto.doses.length} doses were filled in.`,
      );
    }

    for (let i = 1; i < dto.doses.length; i += 1) {
      if (dto.doses[i].dose_time < dto.doses[i - 1].dose_time) {
        throw new BadRequestException(
          'Your doses are out of order. List them in the order you took them.',
        );
      }
    }
  }

  /**
   * The rules inside one dose that no single field can see.
   *
   * A dose that never worked ends there: the six questions after "did you feel
   * it working" are about a period that never began, so they are neither asked
   * nor stored. A dose that did work was asked all of them, and every one of
   * them has to have come back.
   */
  private assertDoseConsistent(dose: DoseLogDto, index: number): void {
    const label = `Dose ${index + 1}`;

    if (dose.first_effect_time === NO_EFFECT) {
      const extra = [
        dose.peak_effect_time,
        dose.pal_pct,
        dose.at_pal_dl_affected_flag,
        dose.dysky_flag,
        dose.dysky_duration,
        dose.dysky_body_part,
        dose.dysky_dl_affected_flag,
        dose.med_wear_off_time,
        dose.off_period_dl_affected_flag,
      ].some(answered);

      if (extra) {
        throw new BadRequestException(
          `${label} is marked as never working, so it cannot also have answers about it working.`,
        );
      }
      return;
    }

    // Asked of every dose that worked, in the order the screens ask them.
    const required: Array<[string, unknown]> = [
      ['when the medicine was working best', dose.peak_effect_time],
      ['how active you were at that point', dose.pal_pct],
      [
        'whether your daily activities were affected',
        dose.at_pal_dl_affected_flag,
      ],
      ['whether you had involuntary movements', dose.dysky_flag],
      ['when the medicine wore off', dose.med_wear_off_time],
      [
        'whether the off period affected your activities',
        dose.off_period_dl_affected_flag,
      ],
    ];
    required.forEach(([question, value]) => {
      if (!answered(value)) {
        throw new BadRequestException(`${label} is missing ${question}.`);
      }
    });

    this.assertDyskinesiaConsistent(dose, label);
  }

  /**
   * The follow-ups to "did you have involuntary movements" have to match the
   * answer that revealed them - describing movements that never happened would
   * be recording an answer nobody was asked for.
   */
  private assertDyskinesiaConsistent(dose: DoseLogDto, label: string): void {
    const hadDyskinesia = dose.dysky_flag === 1;
    const details: Array<[string, unknown]> = [
      ['how long the involuntary movements lasted', dose.dysky_duration],
      ['where you felt them', dose.dysky_body_part],
      [
        'whether they affected your daily activities',
        dose.dysky_dl_affected_flag,
      ],
    ];

    details.forEach(([question, value]) => {
      if (hadDyskinesia && !answered(value)) {
        throw new BadRequestException(`${label} is missing ${question}.`);
      }
      if (!hadDyskinesia && answered(value)) {
        throw new BadRequestException(
          `${label} says there were no involuntary movements, so it cannot also describe them.`,
        );
      }
    });
  }

  /**
   * The same rule one level up: an unbroken night is never asked the three
   * questions about waking, and a night with nothing felt on waking is never
   * asked whether it was troublesome.
   */
  private assertNightConsistent(dto: CreateDailyLogDto): void {
    if (dto.night_wakeup_flag === 0) {
      const extra = [
        dto.night_wakeup_count,
        dto.night_symptoms,
        dto.night_symptoms_troublesome_flag,
      ].some(answered);

      if (extra) {
        throw new BadRequestException(
          'You said you slept through the night, so there is nothing to record about waking up.',
        );
      }
      return;
    }

    if (!answered(dto.night_wakeup_count)) {
      throw new BadRequestException('Enter how many times you woke up.');
    }

    const feltSomething = answered(dto.night_symptoms);
    if (feltSomething && !answered(dto.night_symptoms_troublesome_flag)) {
      throw new BadRequestException(
        'Say whether what you felt at night was troublesome.',
      );
    }
    if (!feltSomething && answered(dto.night_symptoms_troublesome_flag)) {
      throw new BadRequestException(
        'You did not record anything you felt at night, so it cannot be marked troublesome.',
      );
    }
  }
}
