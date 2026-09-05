import type { IconName } from '../../components/Icon';
import type { DailyLogParts } from '../../types/dailyLog';
import { WAKE_COUNTS } from '../../types/dailyLog';
import type { DoseLog, TimeOrNever } from '../../types/doseLog';
import { NO_EFFECT, NO_RETURN } from '../../types/doseLog';
import type { Flag } from '../../types/questionnaire';
import {
  formatDuration,
  formatTime12,
  ordinal,
  parseTime24,
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

/** "7:05 am" from the "HH:MM" the wire carries. */
function at(value: string): string {
  return formatTime12(parseTime24(value));
}

/** A time, or the words that stand in for one when it never happened. */
function timeOr(value: TimeOrNever | null, never: string): string {
  if (value === null) {
    return NOT_ASKED;
  }
  if (value === NO_EFFECT || value === NO_RETURN) {
    return never;
  }
  return at(value);
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
 * The morning question runs the other way: `daily_activities_independence`
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

/** One dose, as the rows that describe it. */
function doseRows(dose: DoseLog): Row[] {
  const rows: Row[] = [
    { label: 'Taken at', value: at(dose.dose_time) },
    { label: 'Amount', value: describeAmount(dose.dose_amount) },
    {
      label: 'First effect at',
      value: timeOr(dose.first_effect_time, 'Did not take effect'),
    },
    {
      label: 'Peak effect at',
      value: timeOr(dose.peak_effect_time, 'Did not take effect'),
    },
    {
      label: 'Activity at peak',
      value:
        dose.peak_activity_level === null
          ? NOT_ASKED
          : `${dose.peak_activity_level}%`,
    },
    {
      label: 'Activities at peak affected',
      value: describeAffected(dose.at_peak_daily_living_affected),
    },
  ];

  if (dose.dyskinesia === 1) {
    const parts = list(dose.dyskinesia_body_part);
    const span =
      dose.dyskinesia_duration === null
        ? ''
        : ` · ${formatDuration(dose.dyskinesia_duration)}`;
    rows.push({ label: 'Dyskinesia', value: `Yes — ${parts}${span}` });
    rows.push({
      label: 'Dyskinesia affected activities',
      value: describeAffected(dose.dyskinesia_daily_living_affected),
    });
  } else {
    rows.push({
      label: 'Dyskinesia',
      value: dose.dyskinesia === null ? NOT_ASKED : 'No',
    });
  }

  rows.push({
    label: 'Symptoms returned',
    value: timeOr(dose.med_wear_off_time, 'Did not return'),
  });
  rows.push({
    label: 'Off state affected activities',
    value: describeAffected(dose.off_period_daily_living_affected),
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
  const { morning, plan, doses, otherMeds, sideEffects, night } = parts;

  const sections: Section[] = [
    {
      icon: 'clock',
      title: 'Morning',
      rows: [
        { label: 'Wake-up time', value: at(morning.wake_time) },
        { label: 'Symptoms', value: list(morning.morning_symptoms) },
        {
          label: 'Independence',
          value: `${morning.wakeup_independence}%`,
        },
        {
          label: 'Activities affected',
          value: describeIndependence(morning.daily_activities_independence),
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
          value: `${plan.num_doses} ${
            plan.num_doses === 1 ? 'time' : 'times'
          } today`,
        },
      ],
    },
  ];

  doses.forEach((dose, index) => {
    sections.push({
      icon: 'capsule',
      title: `${ordinal(index + 1)} dose`,
      rows: doseRows(dose),
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
        night.night_wakeup === 1
          ? `Yes — ${describeWakeCount(night.night_wakeup_count)}`
          : 'No',
    },
  ];
  // The two below are only ever asked of a broken night, so on an unbroken one
  // there is nothing to show rather than a pair of dashes to explain.
  if (night.night_wakeup === 1) {
    nightRows.push({
      label: 'Symptoms at night',
      value: list(night.night_symptoms),
    });
    nightRows.push({
      label: 'Troublesome',
      value:
        night.night_symptoms_troublesome === null
          ? NOT_ASKED
          : night.night_symptoms_troublesome === 1
          ? 'Yes, quite troublesome'
          : 'No, manageable',
    });
  }

  sections.push({ icon: 'moon', title: 'Night review', rows: nightRows });

  return sections;
}
