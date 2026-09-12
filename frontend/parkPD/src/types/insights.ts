/**
 * One day, read as a line - what `GET /logs/insights` answers with.
 *
 * The shape of the line is worked out by the server, off the three views in
 * `db/005_activity_state_views.sql`, and arrives here already cut into
 * segments. The phone does no clinical arithmetic: it scales what it is given
 * onto a chart and formats the minutes into words. That is deliberate - the
 * same numbers will one day feed a week view and a printout for a neurologist,
 * and none of them should be able to disagree with this screen.
 */

/**
 * The three states a stretch of the day can be in.
 *
 * `on` is the medicine working. `transition` is it arriving or wearing off -
 * both slopes, which is why one word covers two shapes. `off` is it not
 * working.
 */
export type ActivityState = 'on' | 'transition' | 'off';

/**
 * One straight piece of the line.
 *
 * Flat when `pct_start` and `pct_end` are equal, sloping when they differ, so
 * the two need no separate flag.
 *
 * Both percentages are null only for doses logged before the app asked how
 * active the person was before a dose. The minutes are real either way, which
 * is why such a span still counts towards the totals and still appears in the
 * written list - it is only the line that cannot be drawn for it.
 */
export type ActivitySpan = {
  /** Which dose this stretch belongs to. */
  dose_number: number;
  state: ActivityState;
  /** UTC instant. */
  starts_at: string;
  ends_at: string;
  /** 0-100, or null when the height was never recorded. */
  pct_start: number | null;
  pct_end: number | null;
};

/**
 * Involuntary movements during a dose - dyskinesia.
 *
 * It carries a length but no time of its own, so it cannot be placed on the
 * clock the way the four dose anchors can. It belongs to the dose, and the
 * chart marks it over the stretch of that dose when the medicine was strongest
 * - which is when peak-dose dyskinesia happens.
 */
export type Dyskinesia = {
  duration_minutes: number;
  /** Where it was felt. Never empty while this object exists. */
  body_parts: string[];
  affected_daily_life: boolean;
};

/** When a dose was taken - the marks along the bottom of the chart. */
export type DoseMarker = {
  dose_number: number;
  dose_time: string;
  /** Sent as a string so that 2.333 tablets cannot become 2.33. */
  tablets_count: string;
  /** Null on a dose that had none, and on one that never worked. */
  dyskinesia: Dyskinesia | null;
};

/**
 * The three figures under the chart, and what they add up to.
 *
 * `recorded_minutes` is the sum of the other three, and it is the number that
 * stops them implying a whole day: the stretch between waking and the first
 * dose has no activity level recorded against it, so it is in none of them.
 */
export type StateTotals = {
  on_minutes: number;
  transition_minutes: number;
  off_minutes: number;
  recorded_minutes: number;
};

/** The stretch of clock the chart covers. */
export type InsightsWindow = {
  starts_at: string;
  ends_at: string;
};

/** One day's insights, whole. */
export type DayInsights = {
  /** `YYYY-MM-DD`, in the user's own local time. */
  log_date: string;
  medicine_name: string;
  dose_count: number;
  /**
   * What was reported on this one day. Not a standing fact about the person,
   * which is why the screen labels it as the day's own answer.
   */
  side_effects: string[] | null;
  window: InsightsWindow | null;
  doses: DoseMarker[];
  /** In the order they are drawn, earliest first. */
  spans: ActivitySpan[];
  totals: StateTotals;
};
