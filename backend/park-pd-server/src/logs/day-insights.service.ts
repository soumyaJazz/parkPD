import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../common/database.module';

/**
 * The three things a stretch of the day can be.
 *
 * Named for what the person experienced rather than for the dose that caused
 * it: "on" is the medicine working, "transition" is it arriving or leaving,
 * "off" is it not working. The words are the ones neurologists already use, and
 * they are what the screen prints beside each figure - the colours are a second
 * signal on top, never the only one.
 */
export type ActivityState = 'on' | 'transition' | 'off';

/**
 * One straight piece of the activity line.
 *
 * A start, an end, and the height at each - which is all a chart needs, and all
 * a sentence like "7:00 AM to 8:00 AM, starting to work" needs either.
 *
 * `pct_start` and `pct_end` are equal on a flat span and differ on a sloping
 * one, so the two shapes need no separate flag. Both are null only on doses
 * logged before the activity-before-the-dose question existed - the minutes are
 * still real, which is why the span is here rather than dropped.
 */
export interface ActivitySpan {
  /** Which dose this stretch belongs to, so a chart can group by it. */
  dose_number: number;
  state: ActivityState;
  starts_at: string;
  ends_at: string;
  pct_start: number | null;
  pct_end: number | null;
}

/** Minutes in each state, as `day_state_totals` returns them. */
export interface StateTotalRow {
  state: ActivityState;
  minutes: number;
}

/**
 * Involuntary movements during a dose - dyskinesia.
 *
 * No time of its own is recorded, only how long it lasted, so it cannot be
 * placed on the clock the way the four anchors can. It belongs to the dose, and
 * the chart marks it against the stretch of that dose when the medicine was at
 * its strongest, which is when peak-dose dyskinesia occurs.
 *
 * Null on a dose that had none, and on a dose that never worked - the question
 * is only asked of a dose that did.
 */
export interface Dyskinesia {
  duration_minutes: number;
  /** Where it was felt. At least one part whenever this object exists. */
  body_parts: string[];
  affected_daily_life: boolean;
}

/** The bare facts about a dose, for the ticks along the bottom of a chart. */
export interface DoseMarker {
  dose_number: number;
  dose_time: string;
  /** `numeric` arrives as a string so that 2.333 cannot become 2.33. */
  tablets_count: string;
  dyskinesia: Dyskinesia | null;
}

interface SpanRow {
  dose_number: number;
  state: ActivityState;
  starts_at: Date;
  ends_at: Date;
  pct_start: number | null;
  pct_end: number | null;
}

/**
 * The dyskinesia answers, or null when there were none to give.
 *
 * `dysky_flag = 1` is what dose_logs_dyskinesia_details guarantees the three
 * follow-ups against, so nothing here can be half-answered - but the columns
 * are nullable for the doses that were never asked, and the defaults below are
 * what keeps a broken row from becoming a NaN on a chart rather than a throw.
 */
function toDyskinesia(row: DoseRow): Dyskinesia | null {
  if (row.dysky_flag !== 1) {
    return null;
  }
  return {
    duration_minutes: row.dysky_duration ?? 0,
    body_parts: row.dysky_body_part ?? [],
    affected_daily_life: row.dysky_dl_affected_flag === 1,
  };
}

interface DoseRow {
  dose_number: number;
  dose_time: Date;
  tablets_count: string;
  dysky_flag: number | null;
  dysky_duration: number | null;
  dysky_body_part: string[] | null;
  dysky_dl_affected_flag: number | null;
}

/**
 * Reads the activity-state views - see `db/005_activity_state_views.sql`.
 *
 * The shape of the line is decided in SQL rather than here on purpose. The
 * chart and the three figures under it are then the same arithmetic run once,
 * so they cannot disagree, and the next thing that wants it - a week view, a
 * printout for a neurologist - gets it without any of this being rewritten in
 * TypeScript a second time.
 *
 * This service only reads. Nothing in it writes, and the views it reads hold no
 * data of their own.
 */
@Injectable()
export class DayInsightsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * The most recent day this account has logged, or null if it never has.
   *
   * Newest first off `daily_logs_user_recent_idx`, which exists for exactly
   * this shape of question, so the answer costs one index row.
   */
  async findLatestLoggedDate(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ log_date: string }>(
      `SELECT to_char(log_date, 'YYYY-MM-DD') AS log_date
         FROM daily_logs
        WHERE user_id = $1
        ORDER BY log_date DESC
        LIMIT 1`,
      [userId],
    );
    return rows[0]?.log_date ?? null;
  }

  /**
   * One day's line, in the order it is drawn.
   *
   * By start time rather than by dose number: a dose taken late in the evening
   * and wearing off after midnight would otherwise sort ahead of a segment that
   * happened hours earlier.
   */
  async findSpans(userId: string, logDate: string): Promise<ActivitySpan[]> {
    const { rows } = await this.pool.query<SpanRow>(
      `SELECT dose_number, state, starts_at, ends_at, pct_start, pct_end
         FROM dose_state_spans
        WHERE user_id = $1 AND log_date = $2::date
        ORDER BY starts_at, dose_number`,
      [userId, logDate],
    );
    return rows.map((row) => ({
      dose_number: row.dose_number,
      state: row.state,
      starts_at: row.starts_at.toISOString(),
      ends_at: row.ends_at.toISOString(),
      pct_start: row.pct_start,
      pct_end: row.pct_end,
    }));
  }

  /** The same day's spans added up - one row per state that occurred at all. */
  async findTotals(userId: string, logDate: string): Promise<StateTotalRow[]> {
    const { rows } = await this.pool.query<StateTotalRow>(
      `SELECT state, minutes
         FROM day_state_totals
        WHERE user_id = $1 AND log_date = $2::date`,
      [userId, logDate],
    );
    return rows;
  }

  /**
   * When each dose was taken, for the marks along the time axis.
   *
   * Read here rather than through `DoseLogsService.findByDay` because that one
   * returns the whole dose - twenty columns of answers about dyskinesia and
   * off-period effects - and a tick on an axis needs three of them.
   */
  async findDoseMarkers(
    userId: string,
    logDate: string,
  ): Promise<DoseMarker[]> {
    const { rows } = await this.pool.query<DoseRow>(
      `SELECT dose_number, dose_time, tablets_count,
              dysky_flag, dysky_duration, dysky_body_part,
              dysky_dl_affected_flag
         FROM dose_logs
        WHERE user_id = $1 AND log_date = $2::date
        ORDER BY dose_time, dose_number`,
      [userId, logDate],
    );
    return rows.map((row) => ({
      dose_number: row.dose_number,
      dose_time: row.dose_time.toISOString(),
      tablets_count: row.tablets_count,
      dyskinesia: toDyskinesia(row),
    }));
  }
}
