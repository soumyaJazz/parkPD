/**
 * One dose, asked ten times over.
 *
 * The ten questions run once per dose, and each dose's answers seed the next
 * one's suggestions - so a day reads as a chain: wake up, dose 1, wear-off,
 * dose 2, wear-off, dose 3. That chain is why a dose is a record of times
 * rather than of durations: an offset is only ever an easier way to pick one.
 */
import type { Flag } from './questionnaire';
import type { DailyActivities } from './dailyLog';
import {
  dayClock,
  isInOrder,
  minutesOfDay,
  ordinal,
  resolveAfter,
} from '../utils/date';
import type { DayClock, TimeFloor, TimeOfDay } from '../utils/date';

/** What Q3 and Q8 answer when the thing they ask about never happened. */
export const NO_EFFECT = 'no-effect';
export const NO_RETURN = 'no-return';

/**
 * A UTC instant, or the answer that there wasn't one.
 *
 * The instant is an ISO 8601 string - "2026-09-06T04:00:00.000Z" - never a
 * clock reading. See `MorningCheck.wake_time` for why, and `dayClock` for how
 * a reading on a clock gets its date.
 */
export type TimeOrNever = string | typeof NO_EFFECT | typeof NO_RETURN;

/**
 * The part-tablet that can sit on top of the whole ones, smallest first.
 *
 * Kept as the fraction it was chosen as for display, and turned into a decimal
 * only on the way out - a third has no exact one, so it is carried at three
 * places, which is what the design does and is close enough for a tablet count.
 */
export const DOSE_FRACTIONS = ['1/4', '1/3', '1/2'] as const;

export type DoseFraction = (typeof DOSE_FRACTIONS)[number];

/** How each fraction is drawn. Spoken labels are written out separately. */
export const FRACTION_GLYPH: Record<DoseFraction, string> = {
  '1/4': '\u00BC',
  '1/3': '\u2153',
  '1/2': '\u00BD',
};

/** What each fraction is worth in `tablets_count`. */
export const FRACTION_VALUE: Record<DoseFraction, number> = {
  '1/4': 0.25,
  '1/3': 0.333,
  '1/2': 0.5,
};

/**
 * Whole tablets on one occasion.
 *
 * A dose does not have to include one: half a tablet on its own is a dose, so
 * "None" sits at the head of this row the same way it heads the fractions.
 */
export const WHOLE_TABLETS = [1, 2, 3, 4] as const;

export type WholeTablets = (typeof WHOLE_TABLETS)[number];

/**
 * The tile standing in for none of a row - no whole tablets, or no part
 * tablet. Either is a real answer; the two together are the only combination
 * the question rejects.
 */
export const NONE_TILE = 'None';

/** Where dyskinesia was felt. Multi-select, and none of them excludes another. */
export const DYSKINESIA_BODY_PARTS = [
  'Right hand',
  'Left hand',
  'Right leg',
  'Left leg',
  'Face / jaw',
  'Neck',
  'Trunk',
  'Both legs',
  'Whole body',
] as const;

/**
 * The offsets each time question offers, in minutes.
 *
 * They are starting points, not a menu: every one of these questions also opens
 * the clock, so an answer that isn't on the list is never harder to give than
 * one that is.
 *
 * Each set is counted from whatever its question is naturally phrased against,
 * which is not the same moment for all four - see the `anchor` each one is
 * given in `buildQuestions`. Three run from the dose; the peak runs from the
 * first improvement, because "how long after it started working did it peak" is
 * the gap people can actually feel. Counting it from the dose instead asks them
 * to do the subtraction in their head before they can recognise their own
 * answer.
 */
export const DOSE_TIME_OFFSETS = [0, 15, 30, 60, 90, 120] as const;
/** From the dose. */
export const FIRST_EFFECT_OFFSETS = [15, 30, 60, 90] as const;
/** From the first improvement, not the dose. */
export const PEAK_EFFECT_OFFSETS = [15, 30, 45, 60, 90] as const;
/** From the dose. */
export const WEAR_OFF_OFFSETS = [240, 270, 300, 330, 360, 420] as const;

/** The activity-level scale at peak, and what its buttons move by. */
export const ACTIVITY_LEVEL = {
  min: 0,
  max: 100,
  step: 10,
  initial: 50,
} as const;

/** A day cannot hold more dyskinesia than it has hours. */
export const MAX_DYSKINESIA_HOURS = 23;

export type DoseLog = {
  /** When it was taken, as a UTC instant. Empty only on an unanswered dose. */
  dose_time: string;
  /** Tablets on this occasion - 1, 1.5, 2.333 and so on. */
  tablets_count: number;
  /**
   * 0-100: how active they were in the run-up to taking it.
   *
   * One of the three answers every dose carries whatever happened next - it is
   * asked beside the dose time, before anything is known about whether the
   * dose worked, so it survives the escape below that ends the dose. `pal_pct`
   * is the other end of the same measurement, at the peak.
   */
  pre_med_al_pct: number;
  /** A time, or `"no-effect"` when the medicine never took hold. */
  first_effect_time: TimeOrNever;
  /**
   * Everything below is null when `first_effect_time` is `"no-effect"`: the
   * dose never worked, so there was no peak to describe and no wearing off to
   * time, and the remaining questions are not put.
   */
  peak_effect_time: TimeOrNever | null;
  pal_pct: number | null;
  at_pal_dl_affected_flag: Flag | null;
  dysky_flag: Flag | null;
  /** Minutes. Null unless `dysky_flag` is 1. */
  dysky_duration: number | null;
  dysky_body_part: string[] | null;
  dysky_dl_affected_flag: Flag | null;
  /** A time, or `"no-return"` when the symptoms stayed away. */
  med_wear_off_time: TimeOrNever | null;
  off_period_dl_affected_flag: Flag | null;
};

/**
 * One dose as the screens hold it.
 *
 * Times and their "it never happened" answers are kept apart rather than folded
 * into one field: picking a time has to be able to undo the escape, and an
 * escape has to be able to clear a time, which a single value can't express
 * without one of them silently winning.
 */
export type DoseDraft = {
  doseTime: TimeOfDay | null;
  /** Null is the "None" tile - a dose can be a part tablet and nothing else. */
  whole: WholeTablets | null;
  /** Null is the "None" tile - no part tablet, which is its own answer. */
  fraction: DoseFraction | null;
  /** Never null - the scale opens on `ACTIVITY_LEVEL.initial`. */
  preMedActivityLevel: number;
  firstEffect: TimeOfDay | null;
  noFirstEffect: boolean;
  peakEffect: TimeOfDay | null;
  noPeakEffect: boolean;
  activityLevel: number;
  peakAdl: DailyActivities | null;
  dyskinesia: boolean | null;
  /** Held as typed, so "75" minutes can be seen before it becomes 1 hr 15. */
  dyskinesiaHours: string;
  dyskinesiaMinutes: string;
  dyskinesiaParts: string[];
  dyskinesiaAdl: DailyActivities | null;
  wearOff: TimeOfDay | null;
  noWearOff: boolean;
  offAdl: DailyActivities | null;
};

export const EMPTY_DOSE: DoseDraft = {
  doseTime: null,
  whole: null,
  fraction: null,
  preMedActivityLevel: ACTIVITY_LEVEL.initial,
  firstEffect: null,
  noFirstEffect: false,
  peakEffect: null,
  noPeakEffect: false,
  activityLevel: ACTIVITY_LEVEL.initial,
  peakAdl: null,
  dyskinesia: null,
  dyskinesiaHours: '',
  dyskinesiaMinutes: '',
  dyskinesiaParts: [],
  dyskinesiaAdl: null,
  wearOff: null,
  noWearOff: false,
  offAdl: null,
};

/** Tablets on this occasion: the whole ones plus whatever part was added. */
export function doseAmount(draft: DoseDraft): number {
  const whole = draft.whole ?? 0;
  const part = draft.fraction === null ? 0 : FRACTION_VALUE[draft.fraction];
  return Number((whole + part).toFixed(3));
}

/** "1 tablet", "2 tablets", "\u00BD tablet", "1\u00BD tablets" - the running total. */
export function describeDose(draft: DoseDraft): string {
  if (draft.whole === null && draft.fraction === null) {
    return 'No dose selected';
  }
  if (draft.fraction === null) {
    return `${draft.whole} ${draft.whole === 1 ? 'tablet' : 'tablets'}`;
  }
  // A part on its own is less than one tablet, so it is the one case that
  // reads in the singular.
  if (draft.whole === null) {
    return `${FRACTION_GLYPH[draft.fraction]} tablet`;
  }
  return `${draft.whole}${FRACTION_GLYPH[draft.fraction]} tablets`;
}

/**
 * The day as one chain of times, and the floor each link sits on.
 *
 * Every time in a day's log comes after the one before it, and the order is
 * fixed by what the questions mean rather than by any rule laid on top: you
 * cannot take a dose before you woke up, feel it working before you took it,
 * peak before you first felt better, or have it wear off before it peaked. The
 * next dose then picks the chain up from wherever the last one left it.
 *
 * The chain is what makes a floor for each question - the earliest a reading
 * may be and still be an answer. It is walked rather than looked up because a
 * link can be missing: a dose that never worked skips the six questions after
 * it, so the dose after that one is measured from when it was *taken*, which
 * is the last thing that dose is known to have done. Same for a dose whose
 * effect never wore off, or never peaked - the floor falls back to the latest
 * reading there actually is.
 *
 * See `isInOrder` for how a reading is measured against a floor, and why a
 * late-night reading that crosses midnight is not the same as a wrong one.
 */

/** Where the chain starts: the morning check's wake-up time. */
export function wakeFloor(wakeTime: TimeOfDay): TimeFloor {
  return {
    minutes: minutesOfDay(wakeTime),
    time: wakeTime,
    was: 'you woke up',
    after: 'after you woke up',
  };
}

/** The chain moved on by one reading, or left where it is when there isn't one. */
function step(
  from: TimeFloor,
  time: TimeOfDay | null,
  was: string,
  after: string,
): TimeFloor {
  if (time === null) {
    return from;
  }
  return { minutes: resolveAfter(time, from.minutes), time, was, after };
}

/** The four floors of one dose, plus where it leaves the chain for the next. */
export type DoseFloors = {
  doseTime: TimeFloor;
  firstEffect: TimeFloor;
  peakEffect: TimeFloor;
  wearOff: TimeFloor;
  /** What the dose after this one is measured from. */
  end: TimeFloor;
};

/**
 * One dose's floors, given where the chain stood when it began.
 *
 * Each floor is the latest reading known before it, so an unanswered or
 * escaped question is stepped over rather than leaving a gap: with no first
 * improvement recorded, the peak is still known to come after the dose.
 */
export function floorsForDose(
  from: TimeFloor,
  dose: DoseDraft,
  doseNumber: number,
): DoseFloors {
  const name = `your ${ordinal(doseNumber)} dose`;
  const taken = step(from, dose.doseTime, `you took ${name}`, `after ${name}`);

  // No motor improvement ends the dose: the questions below it were never put,
  // so the chain leaves this dose at the moment it was swallowed.
  if (dose.noFirstEffect) {
    return {
      doseTime: from,
      firstEffect: taken,
      peakEffect: taken,
      wearOff: taken,
      end: taken,
    };
  }

  const first = step(
    taken,
    dose.firstEffect,
    'you first felt better',
    'after you first felt better',
  );
  const peak = step(
    first,
    dose.noPeakEffect ? null : dose.peakEffect,
    'the medicine was at its best',
    'after the peak effect',
  );
  const wore = step(
    peak,
    dose.noWearOff ? null : dose.wearOff,
    'your symptoms started returning',
    'after your symptoms started returning',
  );

  return {
    doseTime: from,
    firstEffect: taken,
    peakEffect: first,
    wearOff: peak,
    end: wore,
  };
}

/**
 * The floors for the dose at `index`, walked from the wake-up time through
 * every dose before it.
 */
export function doseFloors(
  wakeTime: TimeOfDay,
  doses: DoseDraft[],
  index: number,
): DoseFloors {
  let from = wakeFloor(wakeTime);
  for (let before = 0; before < index; before++) {
    from = floorsForDose(from, doses[before], before + 1).end;
  }
  return floorsForDose(from, doses[index], index + 1);
}

/** The four questions in a dose that ask for a time, in the order they run. */
export const DOSE_TIME_KEYS = [
  'doseTime',
  'firstEffect',
  'peakEffect',
  'wearOff',
] as const;

export type DoseTimeKey = (typeof DOSE_TIME_KEYS)[number];

/** How each of the four is named when it has to be said it was cleared. */
export const DOSE_TIME_LABEL: Record<DoseTimeKey, string> = {
  doseTime: 'the dose time',
  firstEffect: 'the first improvement',
  peakEffect: 'the peak effect',
  wearOff: 'when symptoms returned',
};

/**
 * The day's doses with any time the chain has overtaken cleared.
 *
 * Answers are only ever refused as they are given, so nothing can be entered
 * out of order - but an answer already given can be *left* out of order by
 * going back and changing something above it. Moving a dose from 8 AM to 11 AM
 * does not make the 8:30 AM improvement it caused wrong so much as impossible,
 * and the honest thing is to take it away and ask again rather than to keep a
 * chain that no longer describes a day.
 *
 * Only what actually clashes is cleared: a small change usually leaves
 * everything below it standing.
 */
export function reconcileChain(
  wakeTime: TimeOfDay,
  doses: DoseDraft[],
): DoseDraft[] {
  let from = wakeFloor(wakeTime);

  return doses.map((dose, index) => {
    let kept = dose;
    let floors = floorsForDose(from, kept, index + 1);

    for (const key of DOSE_TIME_KEYS) {
      const time = kept[key];
      if (time !== null && !isInOrder(time, floors[key].minutes)) {
        kept = { ...kept, [key]: null };
        // The chain below this reading was measured against it, so the rest of
        // the dose has to be re-walked before the next key is judged.
        floors = floorsForDose(from, kept, index + 1);
      }
    }

    from = floors.end;
    return kept;
  });
}

/**
 * Which times `reconcileChain` took away, named for saying so out loud.
 *
 * "Dose 2's peak effect" rather than a count: a notice that says a number of
 * answers were cleared leaves the user hunting for which.
 */
export function clearedTimes(
  before: DoseDraft[],
  after: DoseDraft[],
): string[] {
  const names: string[] = [];
  before.forEach((dose, index) => {
    for (const key of DOSE_TIME_KEYS) {
      if (dose[key] !== null && after[index][key] === null) {
        names.push(`${ordinal(index + 1)} dose — ${DOSE_TIME_LABEL[key]}`);
      }
    }
  });
  return names;
}

/** The dyskinesia span in minutes, with the two fields added together. */
export function dyskinesiaMinutes(draft: DoseDraft): number {
  return (
    Number(draft.dyskinesiaHours || 0) * 60 +
    Number(draft.dyskinesiaMinutes || 0)
  );
}

/** 0 or 1, which is how every yes/no in this log is stored. */
function flag(value: boolean): Flag {
  return value ? 1 : 0;
}

function affected(value: DailyActivities | null): Flag {
  // 1 is "yes, I was not able to do work" - the field records the limitation,
  // not the independence.
  return flag(value === 'limited');
}

function timeOrNever(
  clock: DayClock,
  time: TimeOfDay | null,
  never: boolean,
  sentinel: typeof NO_EFFECT | typeof NO_RETURN,
): TimeOrNever {
  return never || time === null ? sentinel : clock(time);
}

/**
 * Every dose of the day, in the order they were taken.
 *
 * Done for the whole day at once rather than a dose at a time because the
 * times have to be stamped in one run: the day's readings share a single
 * `dayClock`, which is what carries the date across midnight for a late dose
 * that wears off the following morning. `after` is the morning check's
 * wake-up time, so the chain starts where the day did.
 */
export function toDoseLogs(
  drafts: DoseDraft[],
  date: string,
  after: string,
): DoseLog[] {
  const clock = dayClock(date, after);
  return drafts.map(draft => toDoseLog(draft, clock));
}

/** One dose as it is sent. The screen validates before this is reached. */
function toDoseLog(draft: DoseDraft, clock: DayClock): DoseLog {
  // Stamped in the order they happened rather than in the order the object
  // below lists them: the clock reads a reading earlier than the last one as
  // having crossed midnight, so feeding it out of order would invent a day.
  const doseTime = draft.doseTime === null ? '' : clock(draft.doseTime);
  const firstEffect = timeOrNever(
    clock,
    draft.firstEffect,
    draft.noFirstEffect,
    NO_EFFECT,
  );

  // No first improvement ends the dose: the six questions after it are about a
  // period that never began, so they are neither asked nor invented here.
  if (firstEffect === NO_EFFECT) {
    return {
      dose_time: doseTime,
      tablets_count: doseAmount(draft),
      // Kept, unlike everything below it: the question was asked and answered
      // before the medicine had done anything, so a dose that never worked
      // still has an activity level it never worked on.
      pre_med_al_pct: draft.preMedActivityLevel,
      first_effect_time: NO_EFFECT,
      peak_effect_time: null,
      pal_pct: null,
      at_pal_dl_affected_flag: null,
      dysky_flag: null,
      dysky_duration: null,
      dysky_body_part: null,
      dysky_dl_affected_flag: null,
      med_wear_off_time: null,
      off_period_dl_affected_flag: null,
    };
  }

  const peakEffect = timeOrNever(
    clock,
    draft.peakEffect,
    draft.noPeakEffect,
    NO_EFFECT,
  );
  const wearOff = timeOrNever(clock, draft.wearOff, draft.noWearOff, NO_RETURN);

  const hasDyskinesia = draft.dyskinesia === true;

  return {
    dose_time: doseTime,
    tablets_count: doseAmount(draft),
    pre_med_al_pct: draft.preMedActivityLevel,
    first_effect_time: firstEffect,
    peak_effect_time: peakEffect,
    pal_pct: draft.activityLevel,
    at_pal_dl_affected_flag: affected(draft.peakAdl),
    dysky_flag: flag(hasDyskinesia),
    dysky_duration: hasDyskinesia ? dyskinesiaMinutes(draft) : null,
    dysky_body_part: hasDyskinesia ? draft.dyskinesiaParts : null,
    dysky_dl_affected_flag: hasDyskinesia
      ? affected(draft.dyskinesiaAdl)
      : null,
    med_wear_off_time: wearOff,
    off_period_dl_affected_flag: affected(draft.offAdl),
  };
}
