import { formatTime24 } from '../utils/date';
import type { TimeOfDay } from '../utils/date';
import type { Flag } from './questionnaire';

/**
 * Where a day stands in the daily log.
 *
 * A day with no entry carries no status at all rather than a third value -
 * "nothing here yet" is the absence of a log, and giving it a name would mean
 * every untouched day in a month had to be listed to say nothing.
 */
export type DayStatus = 'logged' | 'in-progress';

/** Day statuses keyed by `dayKey()` - `YYYY-MM-DD` in local time. */
export type DayStatusMap = Record<string, DayStatus>;

/** How each status is described in words, for the legend and screen readers. */
export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  logged: 'Logged',
  'in-progress': 'In progress',
};

/**
 * The morning check - the first of the three parts of a day's log.
 *
 * Field names are the server's, in the same fixed-contract spirit as
 * `types/questionnaire.ts`: they are not renamed here, so what the screen holds
 * and what goes on the wire differ only in shape, never in vocabulary.
 */
export type MorningCheck = {
  /** "HH:MM", 24-hour, in the user's own timezone. */
  wake_time: string;
  /**
   * What was noticed on waking. An empty list is the "None" answer, which is
   * why the draft below keeps it nullable - "nothing noticed" and "not asked
   * yet" are different answers and cannot share a value.
   */
  morning_symptoms: string[];
  /** 0-100: none of the usual morning routine, through all of it. */
  wakeup_independence: number;
  /**
   * 1 when daily activities were unaffected, 0 when Parkinson's limited them.
   *
   * Read the field name, not the question: the question asks whether the day
   * was *affected*, so the answers map inverted - "yes, I was not able to do
   * work" is 0 here.
   */
  daily_activities_independence: Flag;
};

/** Which way the fourth question was answered, in the words it was asked in. */
export type DailyActivities = 'limited' | 'functional';

/**
 * The morning check as the screen holds it: a question is null until it has
 * been answered, and the two that open on a value say so by not being.
 */
export type MorningCheckDraft = {
  /** Never null - see `DEFAULT_WAKE_TIME`. */
  wakeTime: TimeOfDay;
  symptoms: string[] | null;
  /** What "Others" was described as; ignored unless that chip is picked. */
  symptomOther: string;
  /** Never null - the scale opens at `INDEPENDENCE.initial`. */
  independence: number;
  dailyActivities: DailyActivities | null;
};

export const MORNING_SYMPTOM_NONE = 'None';

/**
 * A prompt for the text field rather than an answer of its own: what the user
 * types replaces it, so what reaches the server is a list of things noticed
 * throughout, with nothing to special-case - the same trick `OTHER_BODY_PART`
 * plays in the profile questionnaire.
 */
export const MORNING_SYMPTOM_OTHER = 'Others';

/** "None" leads, because it is the answer most mornings deserve. */
export const MORNING_SYMPTOMS = [
  MORNING_SYMPTOM_NONE,
  'Stiffness',
  'Tremor',
  'Difficulty moving',
  'Freezing',
  MORNING_SYMPTOM_OTHER,
] as const;

/**
 * Where the clock starts. A wake-up time has no sensible empty state - a
 * stepper has to be stepping from something - so the question opens on a
 * plausible morning and the review step at the end of the log is where it gets
 * confirmed rather than being forced through a tap that says nothing.
 */
export const DEFAULT_WAKE_TIME: TimeOfDay = { hour: 7, minute: 0 };

/** The independence scale, and what its buttons move by. */
export const INDEPENDENCE = {
  min: 0,
  max: 100,
  /** What one press of - or + is worth. */
  step: 10,
  initial: 50,
} as const;

export const EMPTY_MORNING_CHECK: MorningCheckDraft = {
  wakeTime: DEFAULT_WAKE_TIME,
  symptoms: null,
  symptomOther: '',
  independence: INDEPENDENCE.initial,
  dailyActivities: null,
};

/**
 * Which chips read as picked.
 *
 * "None" is never stored: it *is* the empty list. Mutual exclusivity then falls
 * out of the representation instead of being policed on top of it - picking
 * None empties the list, and picking anything else makes it non-empty, which
 * un-picks None on its own.
 */
export function selectedMorningSymptoms(symptoms: string[] | null): string[] {
  if (symptoms === null) {
    return [];
  }
  return symptoms.length === 0 ? [MORNING_SYMPTOM_NONE] : symptoms;
}

/**
 * The list after one chip is pressed. Clearing the last symptom lands on None
 * rather than back on unanswered, which is what the user just said.
 */
export function toggleMorningSymptom(
  symptoms: string[] | null,
  option: string,
): string[] {
  if (option === MORNING_SYMPTOM_NONE) {
    return [];
  }
  const current = symptoms ?? [];
  return current.includes(option)
    ? current.filter(item => item !== option)
    : [...current, option];
}

/** The draft as it is sent. */
export function toMorningCheck(draft: MorningCheckDraft): MorningCheck {
  return {
    wake_time: formatTime24(draft.wakeTime),
    morning_symptoms: (draft.symptoms ?? []).flatMap(symptom =>
      symptom === MORNING_SYMPTOM_OTHER
        ? [draft.symptomOther.trim()]
        : [symptom],
    ),
    wakeup_independence: draft.independence,
    daily_activities_independence: draft.dailyActivities === 'functional' ? 1 : 0,
  };
}
