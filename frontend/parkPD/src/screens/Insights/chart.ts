import type { IconName } from '../../components/Icon';
import { activity } from '../../theme';
import type {
  ActivitySpan,
  ActivityState,
  DayInsights,
  Dyskinesia,
} from '../../types/insights';
import {
  daysAfterDay,
  formatDuration,
  formatTime12,
  toLocalTime,
} from '../../utils/date';

/**
 * The arithmetic behind the Insights chart, kept apart from the drawing of it.
 *
 * Every function here is pure: spans in, coordinates and sentences out. That is
 * partly so the geometry can be reasoned about on its own, and partly because
 * none of it is really about SVG - the same numbers decide where a line goes
 * and what the written list underneath says, and those two must never disagree.
 *
 * Nothing clinical is decided here. Which stretch is on, transition or off was
 * settled by the server - see `db/005_activity_state_views.sql` - and this file
 * only scales it onto a box and puts it into words.
 */

/**
 * How each state is named, drawn and spoken.
 *
 * Three signals per state, never only the colour: a word, an icon, and a line
 * pattern. `short` is what goes on the chart and the totals card, `clinical` is
 * the term a neurologist uses, printed underneath it so the card reads to both
 * audiences.
 */
export const STATE_COPY: Record<
  ActivityState,
  { short: string; clinical: string; phrase: string; icon: IconName }
> = {
  on: {
    short: 'Working',
    clinical: 'On state',
    phrase: 'your medicine was working',
    icon: 'check',
  },
  transition: {
    short: 'Changing',
    clinical: 'Transition state',
    phrase: 'your medicine was starting up or wearing off',
    icon: 'arrowRight',
  },
  off: {
    short: 'Not working',
    clinical: 'Off state',
    phrase: 'your medicine was not working',
    icon: 'close',
  },
};

/**
 * The dash pattern each state's line is drawn with.
 *
 * The second signal after colour, and the one that survives a greyscale
 * printout and the commoner forms of colour blindness - red and green are the
 * pair most often confused, and they are two of the three states here.
 * Undefined is a solid line.
 */
export const STATE_DASH: Record<ActivityState, number[] | undefined> = {
  on: undefined,
  transition: [9, 5],
  off: [2, 6],
};

/** The state's colours, from the theme, by name. */
export function stateColors(state: ActivityState) {
  return activity[state];
}

/** Gridlines every 25, but only three of them carry a number. */
const Y_TICKS = [0, 25, 50, 75, 100] as const;
const Y_LABELLED: readonly number[] = [0, 50, 100];

/**
 * Room around the plot.
 *
 * Left is wide enough for "100" at 14px, which is the smallest type this
 * project allows anywhere. Bottom carries the dose markers and the two end
 * times under them, on two rows rather than one.
 */
const PAD = { left: 40, top: 20, right: 16, bottom: 56 } as const;

const PLOT_HEIGHT = 190;

/** Where a dose's numbered marker sits on the axis, and how big it is. */
export const DOSE_MARKER_RADIUS = 11;

/** Chip geometry - a label sitting on the line itself. */
const CHIP_HEIGHT = 24;
const CHIP_PADDING = 20;
/**
 * Points per character at 14px semibold, used to guess a chip's width.
 *
 * A guess, because react-native-svg cannot measure text before it draws it.
 * Deliberately generous: over-estimating hides a chip that would have just
 * fitted, while under-estimating lets one overhang the span it is labelling,
 * which would point at the wrong stretch of the day.
 */
const CHAR_WIDTH = 8.2;

export type ChartLine = {
  key: string;
  state: ActivityState;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** A stretch with nothing recorded in it, drawn grey and dotted. */
export type ChartGap = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ChartDose = {
  key: string;
  x: number;
  /** 1, 2, 3 - printed inside the marker. */
  number: number;
  /** "8:30 AM", for the screen reader rather than for the axis. */
  time: string;
};

export type ChartChip = {
  key: string;
  state: ActivityState;
  x: number;
  y: number;
  width: number;
  label: string;
};

/**
 * The circle a dyskinesia mark is drawn in. Big enough to hold the hand glyph
 * at a size where its fingers still separate.
 */
export const DYSKINESIA_MARKER_RADIUS = 14;

/**
 * What dyskinesia is called on screen.
 *
 * Named once, here, because it is printed in four places - the key under the
 * chart, every written period, the screen reader's summary and the marker's own
 * label - and a term this specific drifting between them would read as two
 * different things.
 *
 * The clinical word rather than "involuntary movements": it is what the log
 * flow already asks by name, with its own explainer on the question that
 * introduces it, so by the time anyone reaches this screen it is a word they
 * have already answered to.
 */
export const DYSKINESIA_LABEL = 'Dyskinesia';

/** Dyskinesia, marked over the stretch of the dose it belongs to. */
export type ChartDyskinesia = {
  key: string;
  doseNumber: number;
  /** The centre of the circle. */
  x: number;
  y: number;
  /** The whole thing in words, for a screen reader. */
  label: string;
};

export type ChartGridLine = {
  y: number;
  /** Null on the lines drawn between the labelled ones. */
  label: string | null;
};

export type ChartModel = {
  width: number;
  height: number;
  plot: { left: number; top: number; width: number; height: number };
  grid: ChartGridLine[];
  lines: ChartLine[];
  gaps: ChartGap[];
  doses: ChartDose[];
  dyskinesia: ChartDyskinesia[];
  chips: ChartChip[];
  /** The times at the two ends of the axis. */
  startLabel: string;
  endLabel: string;
};

/** A moment as this device's clock shows it, with the day named if it slipped. */
function at(logDate: string, iso: string): string {
  const clock = formatTime12(toLocalTime(iso));
  return daysAfterDay(logDate, iso) > 0 ? `${clock} (next day)` : clock;
}

/** Whole minutes between two instants. */
function minutesBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 60000);
}

/**
 * Dyskinesia, in a sentence.
 *
 * Said in full wherever it appears - on the chart it is a hand with movement
 * lines, and an icon on its own is never the whole of a signal in this app.
 *
 * The places are listed after a colon rather than folded into the sentence, and
 * in the words the person picked them by. "Both legs" and "Whole body" are two
 * of the nine options, and there is no way to read either of those into "in
 * your ..." that comes out as English.
 */
export function describeDyskinesia(dyskinesia: Dyskinesia): string {
  const { duration_minutes: minutes, body_parts: parts } = dyskinesia;
  const where = parts.length > 0 ? ` Felt in: ${parts.join(', ')}.` : '';
  const effect = dyskinesia.affected_daily_life
    ? ' It affected what you could do.'
    : ' It did not affect what you could do.';
  return `${DYSKINESIA_LABEL} for ${formatDuration(minutes)}.${where}${effect}`;
}

/**
 * Which stretch of the day each dose's dyskinesia is marked over.
 *
 * The dose's on period, because that is when peak-dose dyskinesia happens and
 * the data gives no time of its own to place it by - only a length. Falling
 * back to the dose's first stretch covers a dose whose peak was never recorded,
 * where there is no on period to hang it on.
 *
 * A dose with no stretches at all - the last dose of the day, whose spans have
 * no end to clamp to - is left out, and appears only in the written list.
 */
function placeDyskinesia(
  insights: DayInsights,
): Array<{ span: ActivitySpan; dyskinesia: Dyskinesia; doseNumber: number }> {
  const placements: Array<{
    span: ActivitySpan;
    dyskinesia: Dyskinesia;
    doseNumber: number;
  }> = [];

  insights.doses.forEach(dose => {
    if (dose.dyskinesia === null) {
      return;
    }
    const mine = insights.spans.filter(
      one => one.dose_number === dose.dose_number,
    );
    const span = mine.find(one => one.state === 'on') ?? mine[0];
    if (span !== undefined) {
      placements.push({
        span,
        dyskinesia: dose.dyskinesia,
        doseNumber: dose.dose_number,
      });
    }
  });

  return placements;
}

/** A span can only be drawn when both of its heights are known. */
function isDrawable(
  span: ActivitySpan,
): span is ActivitySpan & { pct_start: number; pct_end: number } {
  return span.pct_start !== null && span.pct_end !== null;
}

/**
 * The chart, as coordinates.
 *
 * Null when there is nothing to draw - a day with no doses, or one whose doses
 * have too few times recorded to make a single segment. The screen shows a
 * sentence in that case rather than an empty pair of axes, which would read as
 * a chart that had failed to load.
 */
export function buildChart(
  insights: DayInsights,
  width: number,
): ChartModel | null {
  const { window: frame, spans, doses, log_date: logDate } = insights;
  if (frame === null || spans.length === 0) {
    return null;
  }

  const from = Date.parse(frame.starts_at);
  // A day whose whole record is one instant would divide by zero. It cannot
  // happen - a span has to have length to exist - but the floor costs nothing.
  const total = Math.max(Date.parse(frame.ends_at) - from, 60000);

  const plot = {
    left: PAD.left,
    top: PAD.top,
    width: Math.max(width - PAD.left - PAD.right, 140),
    height: PLOT_HEIGHT,
  };

  const x = (iso: string) =>
    plot.left + ((Date.parse(iso) - from) / total) * plot.width;
  const y = (pct: number) => plot.top + plot.height - (pct / 100) * plot.height;

  const drawable = spans.filter(isDrawable);

  const lines: ChartLine[] = drawable.map((span, index) => ({
    key: `${span.dose_number}-${span.state}-${index}`,
    state: span.state,
    x1: x(span.starts_at),
    y1: y(span.pct_start),
    x2: x(span.ends_at),
    y2: y(span.pct_end),
  }));

  // Between two drawable segments that do not meet - because the one between
  // them had no recorded height, or because nothing was recorded there at all.
  const gaps: ChartGap[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const before = lines[i - 1];
    const after = lines[i];
    const apart =
      Math.abs(after.x1 - before.x2) > 0.5 ||
      Math.abs(after.y1 - before.y2) > 0.5;
    if (apart) {
      gaps.push({
        key: `gap-${i}`,
        x1: before.x2,
        y1: before.y2,
        x2: after.x1,
        y2: after.y1,
      });
    }
  }

  /**
   * The movement marks, worked out before the chips so the chips can dodge
   * them: a mark belongs to one stretch of the day and cannot move, while a
   * chip is only a label and can be dropped when there is nowhere free for it.
   */
  const dyskinesia: ChartDyskinesia[] = [];
  placeDyskinesia(insights).forEach(placement => {
    const index = drawable.indexOf(placement.span as (typeof drawable)[number]);
    if (index === -1) {
      return;
    }
    const line = lines[index];
    dyskinesia.push({
      key: `dysk-${placement.doseNumber}`,
      doseNumber: placement.doseNumber,
      x: (line.x1 + line.x2) / 2,
      // Above the stretch it belongs to, and never off the top of the plot.
      y: Math.max(
        (line.y1 + line.y2) / 2 - DYSKINESIA_MARKER_RADIUS - 10,
        plot.top + DYSKINESIA_MARKER_RADIUS,
      ),
      label: describeDyskinesia(placement.dyskinesia),
    });
  });

  return {
    width,
    height: PAD.top + plot.height + PAD.bottom,
    plot,
    grid: Y_TICKS.map(pct => ({
      y: y(pct),
      label: Y_LABELLED.includes(pct) ? String(pct) : null,
    })),
    lines,
    gaps,
    doses: doses.map(dose => ({
      key: `dose-${dose.dose_number}`,
      // Clamped, so a dose stamped a moment outside the window - which the last
      // one can be - still lands on the axis rather than beside it.
      x: Math.min(
        Math.max(x(dose.dose_time), plot.left),
        plot.left + plot.width,
      ),
      number: dose.dose_number,
      time: at(logDate, dose.dose_time),
    })),
    dyskinesia,
    chips: buildChips(
      drawable,
      x,
      y,
      plot,
      dyskinesia.map(mark => ({
        x: mark.x - DYSKINESIA_MARKER_RADIUS,
        y: mark.y - DYSKINESIA_MARKER_RADIUS,
        width: DYSKINESIA_MARKER_RADIUS * 2,
        height: DYSKINESIA_MARKER_RADIUS * 2,
      })),
    ),
    startLabel: at(logDate, frame.starts_at),
    endLabel: at(logDate, frame.ends_at),
  };
}

/**
 * The labels that sit on the line itself.
 *
 * One per state at most, on that state's longest stretch, so the reader is told
 * what the green line means without having to match a colour to a key. Short
 * stretches get no chip - a label wider than the thing it labels would point at
 * the wrong part of the day - which is why the written list below the chart
 * exists and is not optional.
 *
 * Widest first, so when two chips would collide the one with more room to sit
 * in is the one that survives.
 */
function buildChips(
  drawable: Array<ActivitySpan & { pct_start: number; pct_end: number }>,
  x: (iso: string) => number,
  y: (pct: number) => number,
  plot: { top: number; height: number },
  occupied: ReadonlyArray<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
): ChartChip[] {
  type Drawable = ActivitySpan & { pct_start: number; pct_end: number };
  const widest = new Map<ActivityState, Drawable>();
  drawable.forEach(span => {
    const held = widest.get(span.state);
    const length = Date.parse(span.ends_at) - Date.parse(span.starts_at);
    if (
      held === undefined ||
      length > Date.parse(held.ends_at) - Date.parse(held.starts_at)
    ) {
      widest.set(span.state, span);
    }
  });

  const candidates = [...widest.entries()]
    .map(([state, span]) => {
      const left = x(span.starts_at);
      const right = x(span.ends_at);
      const label = STATE_COPY[state].short;
      const chipWidth = label.length * CHAR_WIDTH + CHIP_PADDING;
      return { state, span, left, right, label, chipWidth };
    })
    .sort((a, b) => b.right - b.left - (a.right - a.left));

  const placed: ChartChip[] = [];
  /** Everything already on the plot, plus each chip as it is accepted. */
  const taken = occupied.map(box => ({ ...box }));
  candidates.forEach(({ state, span, left, right, label, chipWidth }) => {
    if (right - left < chipWidth) {
      return;
    }

    const midY = (y(span.pct_start) + y(span.pct_end)) / 2;
    const chip: ChartChip = {
      key: `chip-${state}`,
      state,
      x: (left + right) / 2 - chipWidth / 2,
      /**
       * Above the line rather than on it, so the stroke it labels stays
       * visible - but never past the top of the plot, which is where a stretch
       * at 100% would otherwise push it. Clamped, so a perfect day still gets
       * its label rather than half a label off the top of the card.
       */
      y: Math.min(
        Math.max(midY - CHIP_HEIGHT - 6, plot.top + 2),
        plot.top + plot.height - CHIP_HEIGHT - 2,
      ),
      width: chipWidth,
      label,
    };

    const clashes = taken.some(
      other =>
        chip.x < other.x + other.width &&
        other.x < chip.x + chip.width &&
        chip.y < other.y + other.height &&
        other.y < chip.y + CHIP_HEIGHT,
    );
    if (!clashes) {
      placed.push(chip);
      taken.push({
        x: chip.x,
        y: chip.y,
        width: chip.width,
        height: CHIP_HEIGHT,
      });
    }
  });

  return placed;
}

export { CHIP_HEIGHT };

/** One line of the written list under the chart. */
export type Period = {
  key: string;
  state: ActivityState;
  /** "6:00 AM to 7:00 AM". */
  time: string;
  /** "1 hr". */
  duration: string;
  /** "Activity 50%", or how it moved, or that it was never recorded. */
  level: string;
  /**
   * Dyskinesia, where this is the stretch it is marked over. Null everywhere
   * else - so the hand on the chart is always backed by the same sentence in
   * words, right here.
   */
  movements: string | null;
};

/**
 * Every stretch of the day, in words.
 *
 * Not a fallback for the chart - a second reading of the same thing. A chart is
 * the wrong shape for some readers and impossible for others, and this list
 * carries every exact time, which the axis deliberately does not.
 */
export function buildPeriods(insights: DayInsights): Period[] {
  const { log_date: logDate, spans } = insights;
  const movements = new Map(
    placeDyskinesia(insights).map(placement => [
      placement.span,
      describeDyskinesia(placement.dyskinesia),
    ]),
  );

  return spans.map((span, index) => ({
    key: `${span.dose_number}-${span.state}-${index}`,
    state: span.state,
    time: `${at(logDate, span.starts_at)} to ${at(logDate, span.ends_at)}`,
    duration: formatDuration(minutesBetween(span.starts_at, span.ends_at)),
    level: describeLevel(span),
    movements: movements.get(span) ?? null,
  }));
}

/** How active the person was across one stretch, in a phrase. */
function describeLevel(span: ActivitySpan): string {
  const { pct_start: start, pct_end: end } = span;
  if (start === null && end === null) {
    return 'Activity level not recorded';
  }
  if (start === null || end === null) {
    return `Activity ${start ?? end}%, the other end not recorded`;
  }
  if (start === end) {
    return `Activity ${start}%`;
  }
  return end > start
    ? `Activity rising from ${start}% to ${end}%`
    : `Activity falling from ${start}% to ${end}%`;
}

/**
 * The sentence above the chart: what is being shown, and over what stretch.
 */
export function describeChart(insights: DayInsights): string {
  if (insights.window === null) {
    return 'How active you were through the day.';
  }
  const { log_date: logDate, window: frame } = insights;
  return `How active you were from ${at(
    logDate,
    frame.starts_at,
  )}, when you took your first dose, to ${at(logDate, frame.ends_at)}.`;
}

/**
 * The sentence below the chart: what it shows, said in words.
 *
 * Named against the recorded stretch rather than against the day, because that
 * is what the figures actually cover - see `totals.recorded_minutes`.
 */
export function describeTotals(insights: DayInsights): string {
  const { on_minutes: on, recorded_minutes: recorded } = insights.totals;
  if (recorded === 0) {
    return 'There is not enough recorded on this day to add up.';
  }
  // Two durations, not a percentage. A share of a day is a number the reader
  // then has to turn back into hours to picture, and the hours are what the
  // question was about.
  return `Your medicine was working for ${formatDuration(
    on,
  )} of the ${formatDuration(recorded)} recorded on this day.`;
}

/**
 * The whole chart as one sentence, for a screen reader.
 *
 * A chart is a picture, and a picture with no text alternative is nothing at
 * all to a reader using VoiceOver or TalkBack. The three figures are the
 * substance of it, so they are what this says.
 */
export function chartAccessibilityLabel(insights: DayInsights): string {
  const { totals } = insights;
  const shaken = insights.doses.filter(dose => dose.dyskinesia !== null).length;

  return [
    'Chart of your activity through the day.',
    `Medicine working, ${formatDuration(totals.on_minutes)}.`,
    `Changing, ${formatDuration(totals.transition_minutes)}.`,
    `Not working, ${formatDuration(totals.off_minutes)}.`,
    shaken === 0
      ? `No ${DYSKINESIA_LABEL.toLowerCase()} was recorded.`
      : `${DYSKINESIA_LABEL} was recorded after ${shaken} ${
          shaken === 1 ? 'dose' : 'doses'
        }.`,
    'Every period is listed in words below the chart.',
  ].join(' ');
}
