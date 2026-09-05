import { formatTime24 } from '../utils/date';
import type { TimeOfDay } from '../utils/date';
import type { Flag } from './questionnaire';
import type { DoseLog } from './doseLog';

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

/**
 * The medication plan - the head of the dose section, and the second of the
 * three parts of a day's log.
 *
 * What is chosen here is quoted back by most of the dose questions that follow,
 * which is why it is asked once, on its own, rather than beside them.
 */
export const MEDICINES = ['Syndopa', 'Syncapone'] as const;

export type Medicine = (typeof MEDICINES)[number];

/**
 * How many times the medicine is taken in the day.
 *
 * Times, not tablets: what the rest of the log needs to know is how many
 * occasions there are to ask about, and how much was swallowed on each is a
 * different question that this one is easily mistaken for.
 */
export const TIMES_TAKEN = {
  /** Zero is an answer: a day the medicine was not taken at all. */
  min: 0,
  max: 8,
  initial: 1,
} as const;

export type MedicationPlan = {
  medicine_name: Medicine;
  /** Occasions in the day, not tablets on any one of them. */
  num_doses: number;
};

export type MedicationPlanDraft = {
  medicine: Medicine | null;
  /** Never null - the stepper opens on `TIMES_TAKEN.initial`. */
  timesTaken: number;
};

export const EMPTY_MEDICATION_PLAN: MedicationPlanDraft = {
  medicine: null,
  timesTaken: TIMES_TAKEN.initial,
};

/** "1 time today", "3 times today" - the unit under the stepper's number. */
export function describeTimesTaken(count: number): string {
  return `${count === 1 ? 'time' : 'times'} today`;
}

/** The draft as it is sent. The screen validates before calling this. */
export function toMedicationPlan(draft: MedicationPlanDraft): MedicationPlan {
  return {
    medicine_name: draft.medicine ?? MEDICINES[0],
    num_doses: draft.timesTaken,
  };
}

/**
 * The common questions - the third part of a day's log.
 *
 * Asked once for the whole day rather than once per dose: what else was taken,
 * what was felt, and how the night went are not properties of any one dose.
 *
 * All of them are multi-select lists that offer an "Other" chip, and all of
 * them treat an empty list the same way - see `chosenOrNull`.
 */

/** The list after one chip is pressed. Shared by every common question. */
export function toggleChoice(chosen: string[], option: string): string[] {
  return chosen.includes(option)
    ? chosen.filter(item => item !== option)
    : [...chosen, option];
}

/**
 * A multi-select answer as it is sent.
 *
 * Two things happen here. The "Other" chip gives way to whatever it was typed
 * as, so what reaches the server is a flat list of real names with nothing to
 * special-case - the trick `MORNING_SYMPTOM_OTHER` plays in the morning check.
 * And nothing chosen is sent as null rather than as an empty list: these
 * questions have no "none" of their own, so an empty list would be a claim the
 * user never made.
 */
function chosenOrNull(
  chosen: string[],
  otherLabel: string,
  otherName: string,
): string[] | null {
  if (chosen.length === 0) {
    return null;
  }
  const described = otherName.trim();
  return chosen.flatMap(choice =>
    choice === otherLabel ? [described] : [choice],
  );
}

/**
 * A prompt for the text field the chip reveals, rather than an answer of its
 * own. What the user types replaces it - see `chosenOrNull`.
 */
export const OTHER_MED_OTHER = 'Other';

/** The medicines commonly taken alongside the day's Parkinson's regimen. */
export const OTHER_MEDICINES = [
  'Pacitane (Trihexyphenidyl)',
  'Ropinirole',
  'Pramipexole',
  'Rasagiline',
  'Selegiline',
  'Amantadine',
  OTHER_MED_OTHER,
] as const;

/** The first of the common questions, as it is sent. */
export type OtherMeds = {
  /** Null when nothing was chosen; never an empty list. */
  other_meds: string[] | null;
};

export type OtherMedsDraft = {
  /** What is ticked. Empty until something is. */
  meds: string[];
  /** What "Other" was named as; ignored unless that chip is picked. */
  otherName: string;
};

export const EMPTY_OTHER_MEDS: OtherMedsDraft = { meds: [], otherName: '' };

/** The draft as it is sent. The screen validates before calling this. */
export function toOtherMeds(draft: OtherMedsDraft): OtherMeds {
  return {
    other_meds: chosenOrNull(draft.meds, OTHER_MED_OTHER, draft.otherName),
  };
}

/** As `OTHER_MED_OTHER`, for the question that follows it. */
export const SIDE_EFFECT_OTHER = 'Other';

/** The side effects the Parkinson's medicines are asked about by name. */
export const MED_SIDE_EFFECTS = [
  'Hallucinations',
  'Depression',
  'Anxiety',
  'Gambling / Shopping / Hypersexuality',
  'Sudden sleep episodes',
  'Giddiness on standing',
  'Constipation',
  'Urinary urgency',
  'Dry mouth',
  'Visual blurring',
  'Confusion / Memory issues',
  'Ankle swelling',
  'Breathing difficulty',
  SIDE_EFFECT_OTHER,
] as const;

/** The second of the common questions, as it is sent. */
export type SideEffects = {
  /** Null when nothing was chosen; never an empty list. */
  med_side_effects: string[] | null;
};

export type SideEffectsDraft = {
  /** What is ticked. Empty until something is. */
  effects: string[];
  /** What "Other" was described as; ignored unless that chip is picked. */
  otherName: string;
};

export const EMPTY_SIDE_EFFECTS: SideEffectsDraft = {
  effects: [],
  otherName: '',
};

/** The draft as it is sent. The screen validates before calling this. */
export function toSideEffects(draft: SideEffectsDraft): SideEffects {
  return {
    med_side_effects: chosenOrNull(
      draft.effects,
      SIDE_EFFECT_OTHER,
      draft.otherName,
    ),
  };
}

/** As `OTHER_MED_OTHER`, for the last of the common questions. */
export const NIGHT_SYMPTOM_OTHER = 'Others';

/** What waking in the night is asked about, in the words the morning uses. */
export const NIGHT_SYMPTOMS = [
  'Stiffness',
  'Tremor',
  'Difficulty moving',
  'Freezing',
  'Dizziness',
  'Pain',
  NIGHT_SYMPTOM_OTHER,
] as const;

/**
 * How many times a broken night is broken.
 *
 * The last one is a floor, not a count: someone waking six times is not going
 * to tally them, and "4 or more" is the answer they would give out loud.
 */
export const WAKE_COUNTS = [
  { value: 1, label: 'Once' },
  { value: 2, label: 'Twice' },
  { value: 3, label: '3 times' },
  { value: 4, label: '4+ times' },
] as const;

/**
 * The third of the common questions, as it is sent.
 *
 * Everything below the first answer is null when the night is unbroken: they
 * are questions about waking up, and a night without it never asks them. The
 * same holds one level down - the symptoms and whether they were troublesome
 * are null when nothing was felt on waking.
 */
export type NightReview = {
  /** 1 when the night is broken by waking, 0 when it is not. */
  night_wakeup: Flag;
  /** How many times, or null on an unbroken night. `4` means four or more. */
  night_wakeup_count: number | null;
  /**
   * What was felt on waking, or null when nothing was - which is also what an
   * unbroken night sends, since `night_wakeup` already tells the two apart.
   */
  night_symptoms: string[] | null;
  /** 1 when the symptoms disturbed the night, or null when there were none. */
  night_symptoms_troublesome: Flag | null;
};

export type NightReviewDraft = {
  wakesAtNight: boolean | null;
  wakeCount: number | null;
  hasSymptoms: boolean | null;
  symptoms: string[];
  /** What "Others" was described as; ignored unless that chip is picked. */
  symptomOther: string;
  troublesome: boolean | null;
};

export const EMPTY_NIGHT_REVIEW: NightReviewDraft = {
  wakesAtNight: null,
  wakeCount: null,
  hasSymptoms: null,
  symptoms: [],
  symptomOther: '',
  troublesome: null,
};

/**
 * The draft with everything below a "no" cleared.
 *
 * Answering the way out of a branch has to take the branch's answers with it,
 * or a night later corrected to unbroken would still be carrying the three
 * questions that only a broken one is asked.
 */
export function collapseNight(draft: NightReviewDraft): NightReviewDraft {
  if (draft.wakesAtNight !== true) {
    return { ...EMPTY_NIGHT_REVIEW, wakesAtNight: draft.wakesAtNight };
  }
  if (draft.hasSymptoms !== true) {
    return { ...draft, symptoms: [], symptomOther: '', troublesome: null };
  }
  return draft;
}

/** The draft as it is sent. The screen validates before calling this. */
export function toNightReview(draft: NightReviewDraft): NightReview {
  if (draft.wakesAtNight !== true) {
    return {
      night_wakeup: 0,
      night_wakeup_count: null,
      night_symptoms: null,
      night_symptoms_troublesome: null,
    };
  }

  const symptoms =
    draft.hasSymptoms === true
      ? chosenOrNull(draft.symptoms, NIGHT_SYMPTOM_OTHER, draft.symptomOther)
      : null;

  return {
    night_wakeup: 1,
    night_wakeup_count: draft.wakeCount,
    night_symptoms: symptoms,
    night_symptoms_troublesome:
      symptoms === null ? null : draft.troublesome === true ? 1 : 0,
  };
}

/**
 * A whole day, as it is sent.
 *
 * The three common questions are spread flat rather than nested: their field
 * names were chosen to stand on their own at the top level, and wrapping
 * `other_meds` inside an `other_meds` object would say the same word twice.
 */
export type DailyLogRequest = {
  /** `dayKey()` - `YYYY-MM-DD` in the user's own timezone. */
  date: string;
  morning_check: MorningCheck;
  medication_plan: MedicationPlan;
  /** One entry per dose, in the order they were taken. Empty on a day with none. */
  doses: DoseLog[];
} & OtherMeds &
  SideEffects &
  NightReview;

/**
 * Everything the day's screens gathered, in the shape they hand each other.
 *
 * Named apart from the request so the review screen can take its route params
 * and pass them straight through - the params are this, and nothing else.
 */
export type DailyLogParts = {
  date: string;
  morning: MorningCheck;
  plan: MedicationPlan;
  doses: DoseLog[];
  otherMeds: OtherMeds;
  sideEffects: SideEffects;
  night: NightReview;
};

/** The day as one payload, assembled from the parts each step collected. */
export function toDailyLog(parts: DailyLogParts): DailyLogRequest {
  return {
    date: parts.date,
    morning_check: parts.morning,
    medication_plan: parts.plan,
    doses: parts.doses,
    ...parts.otherMeds,
    ...parts.sideEffects,
    ...parts.night,
  };
}
