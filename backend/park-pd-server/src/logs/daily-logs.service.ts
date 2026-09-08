import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, Queryable } from '../common/database.module';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';

/**
 * Everything the client sent about a day except its doses - see `DailyLog`.
 */
export type DailyLogBody = Omit<CreateDailyLogDto, 'doses'>;

/**
 * One day's log as it sits in the database.
 *
 * Everything the client sent, plus the three things it could not: which account
 * it belongs to, and when the row was first written and last touched. The
 * submitted fields are not renamed on the way in - the wire names are the
 * contract, and a mapping layer here would only be somewhere else for the two
 * sides to drift apart.
 *
 * The doses are the one part that does not live here. They go to `dose_logs`
 * keyed by this row's `id`, so that the day keeps the answers asked once a day
 * - the morning, the night, the medicine - and the doses stay a list you can
 * read on their own. `dose_count` is still here, and is what that list has to
 * add up to.
 */
export interface DailyLog extends DailyLogBody {
  /** This day row's own identity. */
  id: string;
  /** Whose day it is. Never taken from the body - see `CreateDailyLogDto`. */
  user_id: string;
  created_at: string;
  /** Moves when a day is logged again; `created_at` stays put. */
  updated_at: string;
}

/**
 * What every read selects.
 *
 * `log_date` is formatted by Postgres for the same reason the profile's `dob`
 * is: a `date` arrives from the driver as a JS Date at local midnight, and
 * reading the day back out of that in a zone behind UTC gives the day before.
 * The timestamps stay Dates and become ISO strings below.
 */
const DAY_COLUMNS = `
  id, user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date,
  timezone, utc_offset_minutes,
  wake_time, morning_symptoms, wakeup_independence_pct,
  daily_activities_independence_flag,
  medicine_name, dose_count, other_meds, med_side_effects,
  night_wakeup_flag, night_wakeup_count, night_symptoms,
  night_symptoms_troublesome_flag,
  created_at, updated_at`;

/** The answers the client sends, in the order the writes below bind them. */
const WRITTEN_COLUMNS = [
  'timezone',
  'utc_offset_minutes',
  'wake_time',
  'morning_symptoms',
  'wakeup_independence_pct',
  'daily_activities_independence_flag',
  'medicine_name',
  'dose_count',
  'other_meds',
  'med_side_effects',
  'night_wakeup_flag',
  'night_wakeup_count',
  'night_symptoms',
  'night_symptoms_troublesome_flag',
] as const;

type DayRow = Record<string, unknown>;

/**
 * A row in the shape the rest of the app reads.
 *
 * Nulls are kept rather than dropped, unlike the user row: every one of them
 * was written as an explicit null by `LogsService.toStoredDay`, because a
 * question that was asked and answered "nothing" is not the same as a question
 * that was never put.
 */
function rowToDailyLog(row: DayRow): DailyLog {
  const log: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    log[column] = value instanceof Date ? value.toISOString() : value;
  }
  return log as unknown as DailyLog;
}

@Injectable()
export class DailyLogsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * One user's log for one day, or undefined.
   *
   * The pair is the real key: two people log the same date, and one person logs
   * a date at most once. The schema says so too, as a unique constraint.
   */
  async findByUserAndDate(
    userId: string,
    logDate: string,
    db: Queryable = this.pool,
  ): Promise<DailyLog | undefined> {
    const { rows } = await db.query<DayRow>(
      `SELECT ${DAY_COLUMNS} FROM daily_logs
        WHERE user_id = $1 AND log_date = $2::date`,
      [userId, logDate],
    );
    return rows[0] && rowToDailyLog(rows[0]);
  }

  /** Every day this user has logged, newest day first. */
  async findAllByUser(userId: string): Promise<DailyLog[]> {
    const { rows } = await this.pool.query<DayRow>(
      `SELECT ${DAY_COLUMNS} FROM daily_logs
        WHERE user_id = $1
        ORDER BY log_date DESC`,
      [userId],
    );
    return rows.map(rowToDailyLog);
  }

  /**
   * One user's logs between two days, both ends included, oldest first.
   *
   * Sorted by the database rather than after the fact, which is what the index
   * on (user_id, log_date) is for - a month of days comes back already in the
   * order the calendar draws them.
   */
  async findByUserInRange(
    userId: string,
    from: string,
    to: string,
  ): Promise<DailyLog[]> {
    const { rows } = await this.pool.query<DayRow>(
      `SELECT ${DAY_COLUMNS} FROM daily_logs
        WHERE user_id = $1 AND log_date BETWEEN $2::date AND $3::date
        ORDER BY log_date`,
      [userId, from, to],
    );
    return rows.map(rowToDailyLog);
  }

  /**
   * Writes one day, replacing whatever was there for that day before.
   *
   * Replacing rather than appending is what makes a re-submit safe: a log that
   * was saved but whose response was lost to a dropped connection can simply be
   * sent again, and the day someone fills in a second time to correct it ends
   * up with one row, not two that disagree.
   *
   * One statement rather than a read and then a write, so two requests for the
   * same day cannot both find nothing and both insert. The unique constraint on
   * (user_id, log_date) is what `ON CONFLICT` watches, so the second one
   * updates instead of failing.
   *
   * `created_at` is deliberately not in the update list: it is when the day was
   * first logged, which a correction does not change.
   */
  async save(
    userId: string,
    entry: DailyLogBody,
    db: Queryable = this.pool,
  ): Promise<DailyLog> {
    const values: unknown[] = [
      userId,
      entry.log_date,
      ...WRITTEN_COLUMNS.map(
        (column) => (entry as Record<string, unknown>)[column] ?? null,
      ),
    ];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const updates = WRITTEN_COLUMNS.map(
      (column) => `${column} = EXCLUDED.${column}`,
    );

    const { rows } = await db.query<DayRow>(
      `INSERT INTO daily_logs (user_id, log_date, ${WRITTEN_COLUMNS.join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (user_id, log_date) DO UPDATE
          SET ${updates.join(', ')}, updated_at = now()
       RETURNING ${DAY_COLUMNS}`,
      values,
    );
    return rowToDailyLog(rows[0]);
  }
}
