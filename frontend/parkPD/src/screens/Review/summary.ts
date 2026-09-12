import type { IconName } from '../../components/Icon';
import type { DailyLogParts } from '../../types/dailyLog';
import { WAKE_COUNTS } from '../../types/dailyLog';
import type { DoseLog, TimeOrNever } from '../../types/doseLog';
import { NO_EFFECT, NO_RETURN } from '../../types/doseLog';
import type { Flag } from '../../types/questionnaire';
import {
  daysAfterDay,
  formatDuration,
  formatTime12,
  ordinal,
  toLocalTime,
} from '../../utils/date';

/**
 * A question that was never put, as against one answered with nothing.
 *
 * The difference matters on this screen more than anywhere else: a dose that
 * never took effect is not the same as a dose whose peak went unrecorded, and
 * the review is the last place either can be caught.
 */
const NOT_ASKED = '—';

export type Row = { label: string; value: string };
export type Section = { icon: IconName; title: string; rows: Row[] };

/**
 * "7:05 AM" from the UTC instant the wire carries, back on the clock it was
 * read from.
 *
 * A late dose wears off after midnight, and the instant knows that while the
 * clock face does not - so a reading that landed on the following day says so
 * in words. Without it the review would show a 2 AM wear-off above a 11 PM
 * dose and look like a mistake the user had to hunt for.
 */
function at(value: string, date: string): string {
  const shown = formatTime12(toLocalTime(value));
  return daysAfterDay(date, value) > 0 ? `${shown} (next day)` : shown;
}

/** A time, or the words that stand in for one when it never happened. */
function timeOr(
  value: TimeOrNever | null,
  never: string,
  date: string,
): string {
  if (value === null) {
    return NOT_ASKED;
  }
  if (value === NO_EFFECT || value === NO_RETURN) {
    return never;
  }
  return at(value, date);
}

/** A list of answers, or the word for having chosen none of them. */
function list(values: string[] | null): string {
  return values === null || values.length === 0 ? 'None' : values.join(', ');
}

/**
 * The dose questions record the *limitation*: 1 is "yes, I was not able to do
 * work". Read `affected()` in `types/doseLog.ts` before changing this.
 */
function describeAffected(value: Flag | null): string {
  if (value === null) {
    return NOT_ASKED;
  }
  return value === 1 ? 'Yes, it did' : 'No, managed';
}

/**
 * The morning question runs the other way: `daily_activities_independence_flag`
 * records the independence, so 1 is the *good* answer. The two look alike and
 * mean opposite things, which is exactly why they have separate readers.
 */
function describeIndependence(value: Flag): string {
  return value === 1 ? 'No, I was functional' : 'Yes, it limited me';
}

/** "1 tablet", "1.5 tablets" - trimmed, so a third of a tablet isn't 2.333. */
function describeAmount(amount: number): string {
  const rounded = Number(amount.toFixed(2));
  return `${rounded} ${rounded === 1 ? 'tablet' : 'tablets'}`;
}

/** "Twice", from the count the tiles recorded. */
function describeWakeCount(count: number | null): string {
  const match = WAKE_COUNTS.find(option => option.value === count);
  return match === undefined ? NOT_ASKED : match.label;
}

/** One dose, as the rows that describe it. `date` is the day being logged. */
function doseRows(dose: DoseLog, date: string): Row[] {
  const rows: Row[] = [
    { label: 'Taken at', value: at(dose.dose_time, date) },
    { label: 'Amount', value: describeAmount(dose.tablets_count) },
    // Above the effect rows on purpose, in the order it was asked: it
    // describes the time before the tablet, and the peak figure further down
    // is what it gets read against.
    { label: 'Activity before dose', value: `${dose.pre_med_al_pct}%` },
    {
      label: 'First effect at',
      value: timeOr(dose.first_effect_time, 'Did not take effect', date),
    },
    {
      label: 'Peak effect at',
      value: timeOr(dose.peak_effect_time, 'Did not take effect', date),
    },
    {
      label: 'Activity at peak',
      value:
        dose.pal_pct === null
          ? NOT_ASKED
          : `${dose.pal_pct}%`,
    },
    {
      label: 'Activities at peak affected',
      value: describeAffected(dose.at_pal_dl_affected_flag),
    },
  ];

  if (dose.dysky_flag === 1) {
    const parts = list(dose.dysky_body_part);
    const span =
      dose.dysky_duration === null
        ? ''
        : ` · ${formatDuration(dose.dysky_duration)}`;
    rows.push({ label: 'Dyskinesia', value: `Yes — ${parts}${span}` });
    rows.push({
      label: 'Dyskinesia affected activities',
      value: describeAffected(dose.dysky_dl_affected_flag),
    });
  } else {
    rows.push({
      label: 'Dyskinesia',
      value: dose.dysky_flag === null ? NOT_ASKED : 'No',
    });
  }

  rows.push({
    label: 'Symptoms returned',
    value: timeOr(dose.med_wear_off_time, 'Did not return', date),
  });
  rows.push({
    label: 'Off state affected activities',
    value: describeAffected(dose.off_period_dl_affected_flag),
  });

  return rows;
}

/**
 * The whole day, as the cards the review shows.
 *
 * Built from the parts each step handed on rather than from their drafts: what
 * is checked here has to be what is sent, or the review would be reassuring
 * the user about something else.
 */
export function buildSections(parts: DailyLogParts): Section[] {
  const { date, morning, plan, doses, otherMeds, sideEffects, night } = parts;

  const sections: Section[] = [
    {
      icon: 'clock',
      title: 'Morning',
      rows: [
        { label: 'Wake-up time', value: at(morning.wake_time, date) },
        { label: 'Symptoms', value: list(morning.morning_symptoms) },
        {
          label: 'Independence',
          value: `${morning.wakeup_independence_pct}%`,
        },
        {
          label: 'Activities affected',
          value: describeIndependence(morning.daily_activities_independence_flag),
        },
      ],
    },
    {
      icon: 'list',
      title: 'Medication',
      rows: [
        { label: 'Medicine', value: plan.medicine_name },
        {
          label: 'Times taken',
          value: `${plan.dose_count} ${
            plan.dose_count === 1 ? 'time' : 'times'
          } today`,
        },
      ],
    },
  ];

  doses.forEach((dose, index) => {
    sections.push({
      icon: 'capsule',
      title: `${ordinal(index + 1)} dose`,
      rows: doseRows(dose, date),
    });
  });

  sections.push({
    icon: 'capsule',
    title: 'Other medications',
    rows: [{ label: 'Medicines taken', value: list(otherMeds.other_meds) }],
  });

  sections.push({
    icon: 'bell',
    title: 'Side effects',
    rows: [
      { label: 'Side effects', value: list(sideEffects.med_side_effects) },
    ],
  });

  const nightRows: Row[] = [
    {
      label: 'Woke up at night',
      value:
        night.night_wakeup_flag === 1
          ? `Yes — ${describeWakeCount(night.night_wakeup_count)}`
          : 'No',
    },
  ];
  // The two below are only ever asked of a broken night, so on an unbroken one
  // there is nothing to show rather than a pair of dashes to explain.
  if (night.night_wakeup_flag === 1) {
    nightRows.push({
      label: 'Symptoms at night',
      value: list(night.night_symptoms),
    });
    nightRows.push({
      label: 'Troublesome',
      value:
        night.night_symptoms_troublesome_flag === null
          ? NOT_ASKED
          : night.night_symptoms_troublesome_flag === 1
          ? 'Yes, quite troublesome'
          : 'No, manageable',
    });
  }

  sections.push({ icon: 'moon', title: 'Night review', rows: nightRows });

  return sections;
}
