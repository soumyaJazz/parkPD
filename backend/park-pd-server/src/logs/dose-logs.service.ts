import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL, Queryable } from '../common/database.module';
import { DoseLogDto, NO_EFFECT, NO_RETURN } from './dto/dose-log.dto';

/** The day's `created_at`/`updated_at`, carried onto every dose it holds. */
export interface DoseTimestamps {
  created_at: string;
  updated_at: string;
}

/**
 * One dose as it sits in the database.
 *
 * Kept apart from the day rather than nested inside it because a dose is the
 * thing this app is actually about: "how long did the medicine take to work"
 * and "how often did it wear off early" are questions about doses, and a
 * question about doses should not have to open every day of the year and dig
 * through an array to find them.
 *
 * `daily_log_id` is the link to the day. `user_id` and `log_date` are carried
 * alongside it so a dose row is legible on its own and so "show me Tuesday" is
 * answerable without first looking up a day to find its id. The schema is what
 * stops those two copies drifting from the day they point at - see the
 * composite foreign key on `dose_logs`.
 */
export interface DoseLogRecord extends DoseLogDto {
  /** This dose row's own identity. */
  id: string;
  /** The day it belongs to. */
  daily_log_id: string;
  /** Whose dose it is. Copied from the day, which took it from the token. */
  user_id: string;
  /**
   * The day it belongs to, as `YYYY-MM-DD` in the user's own local time - the
   * same `log_date` the day row carries.
   */
  log_date: string;
  /** 1, 2, 3 - the order they were taken in, which the day's chain depends on. */
  dose_number: number;
  created_at: string;
  updated_at: string;
}

/**
 * The columns written for each dose, in the order `replaceForDay` binds them.
 *
 * The three questions that can be answered with a word instead of a time are
 * each two columns here - see the note on `toRow`.
 */
const DOSE_COLUMNS = [
  'daily_log_id',
  'user_id',
  'log_date',
  'dose_number',
  'dose_time',
  'tablets_count',
  'first_effect_time',
  'first_effect_flag',
  'peak_effect_time',
  'peak_effect_flag',
  'pal_pct',
  'at_pal_dl_affected_flag',
  'dysky_flag',
  'dysky_duration',
  'dysky_body_part',
  'dysky_dl_affected_flag',
  'med_wear_off_time',
  'med_wear_off_flag',
  'off_period_dl_affected_flag',
  'created_at',
  'updated_at',
] as const;

const SELECTED = `
  id, daily_log_id, user_id, to_char(log_date, 'YYYY-MM-DD') AS log_date,
  dose_number, dose_time, tablets_count,
  first_effect_time, first_effect_flag,
  peak_effect_time, peak_effect_flag,
  pal_pct, at_pal_dl_affected_flag,
  dysky_flag, dysky_duration, dysky_body_part, dysky_dl_affected_flag,
  med_wear_off_time, med_wear_off_flag, off_period_dl_affected_flag,
  created_at, updated_at`;

interface DoseRow {
  id: string;
  daily_log_id: string;
  user_id: string;
  log_date: string;
  dose_number: number;
  dose_time: Date;
  /** `numeric` arrives as a string, so that 2.333 cannot quietly become 2.33. */
  tablets_count: string;
  first_effect_time: Date | null;
  first_effect_flag: number;
  peak_effect_time: Date | null;
  peak_effect_flag: number | null;
  pal_pct: number | null;
  at_pal_dl_affected_flag: number | null;
  dysky_flag: number | null;
  dysky_duration: number | null;
  dysky_body_part: string[] | null;
  dysky_dl_affected_flag: number | null;
  med_wear_off_time: Date | null;
  med_wear_off_flag: number | null;
  off_period_dl_affected_flag: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Puts a stored time and its flag back together into the one field the client
 * sends and reads: an instant, the word that says the instant never came, or
 * null for a question that was never reached.
 */
function readSentinel(
  time: Date | null,
  flag: number | null,
  word: string,
): string | null {
  if (flag === null) {
    return null;
  }
  return flag === 0 ? word : time!.toISOString();
}

/** The reverse: one field from the client, split into the two columns. */
function writeSentinel(
  value: string | null | undefined,
  word: string,
): [string | null, number | null] {
  if (value === null || value === undefined) {
    return [null, null];
  }
  return value === word ? [null, 0] : [value, 1];
}

function rowToDose(row: DoseRow): DoseLogRecord {
  return {
    id: row.id,
    daily_log_id: row.daily_log_id,
    user_id: row.user_id,
    log_date: row.log_date,
    dose_number: row.dose_number,
    dose_time: row.dose_time.toISOString(),
    tablets_count: Number(row.tablets_count),
    first_effect_time: readSentinel(
      row.first_effect_time,
      row.first_effect_flag,
      NO_EFFECT,
    )!,
    peak_effect_time: readSentinel(
      row.peak_effect_time,
      row.peak_effect_flag,
      NO_EFFECT,
    ),
    pal_pct: row.pal_pct,
    at_pal_dl_affected_flag:
      row.at_pal_dl_affected_flag as DoseLogDto['at_pal_dl_affected_flag'],
    dysky_flag: row.dysky_flag as DoseLogDto['dysky_flag'],
    dysky_duration: row.dysky_duration,
    dysky_body_part: row.dysky_body_part,
    dysky_dl_affected_flag:
      row.dysky_dl_affected_flag as DoseLogDto['dysky_dl_affected_flag'],
    med_wear_off_time: readSentinel(
      row.med_wear_off_time,
      row.med_wear_off_flag,
      NO_RETURN,
    ),
    off_period_dl_affected_flag:
      row.off_period_dl_affected_flag as DoseLogDto['off_period_dl_affected_flag'],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class DoseLogsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** One person's doses for one day, in the order they were taken. */
  async findByDay(userId: string, logDate: string): Promise<DoseLogRecord[]> {
    const { rows } = await this.pool.query<DoseRow>(
      `SELECT ${SELECTED} FROM dose_logs
        WHERE user_id = $1 AND log_date = $2::date
        ORDER BY dose_number`,
      [userId, logDate],
    );
    return rows.map(rowToDose);
  }

  /**
   * Writes one day's doses, dropping whatever that day held before.
   *
   * Dropping first is the whole point. `DailyLogsService.save` replaces a day
   * in place, so a day first logged with four doses and then corrected to two
   * would otherwise leave the last two behind - rows still claiming a day whose
   * dose count no longer matches them.
   *
   * Both halves of the link are matched when dropping. Filtering on the date
   * alone would clear that day for every account.
   *
   * `db` is the caller's transaction. The delete and the insert have to be in
   * one, together with the day itself: between them the day exists with no
   * doses, and a reader arriving at that moment would see a day that claims
   * doses it cannot show.
   */
  async replaceForDay(
    dailyLogId: string,
    userId: string,
    logDate: string,
    doses: DoseLogDto[],
    timestamps: DoseTimestamps,
    db: Queryable = this.pool,
  ): Promise<DoseLogRecord[]> {
    await db.query(
      `DELETE FROM dose_logs WHERE user_id = $1 AND log_date = $2::date`,
      [userId, logDate],
    );

    // A day on which no medicine was taken is a real answer, and there is
    // nothing to insert for it.
    if (doses.length === 0) {
      return [];
    }

    const values: unknown[] = [];
    const tuples = doses.map((dose, index) => {
      const row = this.toRow(
        dailyLogId,
        userId,
        logDate,
        dose,
        index + 1,
        timestamps,
      );
      const placeholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const { rows } = await db.query<DoseRow>(
      `INSERT INTO dose_logs (${DOSE_COLUMNS.join(', ')})
       VALUES ${tuples.join(', ')}
       RETURNING ${SELECTED}`,
      values,
    );
    return rows.map(rowToDose).sort((a, b) => a.dose_number - b.dose_number);
  }

  /**
   * One dose as columns, in `DOSE_COLUMNS` order.
   *
   * The identity fields are taken from the day rather than from the dose, so
   * nothing that arrived in the body can claim to belong to a different day or
   * a different account.
   */
  private toRow(
    dailyLogId: string,
    userId: string,
    logDate: string,
    dose: DoseLogDto,
    doseNumber: number,
    timestamps: DoseTimestamps,
  ): unknown[] {
    const [firstEffect, firstEffectFlag] = writeSentinel(
      dose.first_effect_time,
      NO_EFFECT,
    );
    const [peak, peakFlag] = writeSentinel(dose.peak_effect_time, NO_EFFECT);
    const [wearOff, wearOffFlag] = writeSentinel(
      dose.med_wear_off_time,
      NO_RETURN,
    );

    return [
      dailyLogId,
      userId,
      logDate,
      doseNumber,
      dose.dose_time,
      dose.tablets_count,
      firstEffect,
      firstEffectFlag,
      peak,
      peakFlag,
      dose.pal_pct ?? null,
      dose.at_pal_dl_affected_flag ?? null,
      dose.dysky_flag ?? null,
      dose.dysky_duration ?? null,
      dose.dysky_body_part ?? null,
      dose.dysky_dl_affected_flag ?? null,
      wearOff,
      wearOffFlag,
      dose.off_period_dl_affected_flag ?? null,
      timestamps.created_at,
      timestamps.updated_at,
    ];
  }
}
