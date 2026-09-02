/**
 * The clinical questionnaire asked straight after the profile details.
 *
 * Field names below are the server's, not this app's - they arrived as a fixed
 * contract, which is why the casing is mixed (`first_symptom` beside
 * `firstPart`). They are deliberately not "tidied": renaming here would only
 * move the mismatch to a mapping layer.
 */

/** Every yes/no answer travels as 0 or 1, not a boolean. */
export type Flag = 0 | 1;

/** How the user wants to be asked for their daily dose log later on. */
export type DoseMode = 'pages' | 'scroll';

export type QuestionnaireAnswers = {
  /** Total months, folded down from the years and months fields. */
  p_duration: number;
  first_symptom: string[];
  first_affected_part: string[];
  /**
   * Falls in the last year, or null when there is no history of them. The
   * count carries the yes/no, so there is no separate flag - and null is not
   * interchangeable with 0, which means "a history of falls, none this year".
   */
  recc_falls: number | null;
  /** Null whenever `recc_falls` is - there were no falls to characterise. */
  recc_falls_type: string[] | null;
  psychiatric: Flag;
  /**
   * What the user uses, or null when there is no history. An empty array is a
   * third answer: a history they chose not to break down.
   */
  addiction: string[] | null;
  rem: Flag;
  non_motor_symptoms: string[];
  /** Null when the condition was answered "no", otherwise years since onset. */
  diabetes_yrs: number | null;
  hypertension_yrs: number | null;
  thyroid_yrs: number | null;
  family_p_history: Flag;
  walk_independent: Flag;
  assistance_needed: Flag;
  dose_mode: DoseMode;
};

/**
 * The answers as the form holds them, which is not how they are sent: numbers
 * are text while being typed, and every question is null until it has been
 * answered. `toQuestionnaireAnswers` is where this becomes the wire shape.
 *
 * It lives here rather than in the screen because it outlives the screen - see
 * SetupDraftContext, which keeps it while the user steps back to the details.
 */
export type QuestionnaireDraft = {
  years: string;
  months: string;
  firstSymptoms: string[];
  bodyParts: string[];
  bodyPartOther: string;
  falls: boolean | null;
  fallsPerYear: string;
  fallsTypes: string[];
  psychiatric: boolean | null;
  addiction: boolean | null;
  addictionTypes: string[];
  rem: boolean | null;
  /**
   * Null until answered. An empty array is the "None of these" answer, so the
   * two can't be the same value - otherwise the question would look answered
   * from the moment the screen opened.
   */
  nonMotor: string[] | null;
  diabetes: boolean | null;
  diabetesYears: string;
  hypertension: boolean | null;
  hypertensionYears: string;
  thyroid: boolean | null;
  thyroidYears: string;
  familyHistory: boolean | null;
  walkIndependent: boolean | null;
  assistanceNeeded: boolean | null;
  doseMode: DoseMode | null;
};

export const EMPTY_DRAFT: QuestionnaireDraft = {
  years: '',
  months: '',
  firstSymptoms: [],
  bodyParts: [],
  bodyPartOther: '',
  falls: null,
  fallsPerYear: '',
  fallsTypes: [],
  psychiatric: null,
  addiction: null,
  addictionTypes: [],
  rem: null,
  nonMotor: null,
  diabetes: null,
  diabetesYears: '',
  hypertension: null,
  hypertensionYears: '',
  thyroid: null,
  thyroidYears: '',
  familyHistory: null,
  walkIndependent: null,
  assistanceNeeded: null,
  doseMode: null,
};

/** Months are a remainder, so they never reach a full year. */
export const MAX_MONTHS = 11;

export const FIRST_SYMPTOMS = [
  'Tremor',
  'Slowness',
  'Reduced voice volume',
  'Freezing while walking',
] as const;

/**
 * "Other" is a prompt for the text field rather than an answer: what the user
 * types replaces it in the array, so what reaches the server is a list of body
 * parts throughout, with nothing to special-case.
 */
export const OTHER_BODY_PART = 'Other';

export const BODY_PARTS = [
  'Right hand',
  'Left hand',
  'Right leg',
  'Left leg',
  'Face / jaw',
  'Both hands symmetrically',
  'Both legs symmetrically',
  OTHER_BODY_PART,
] as const;

export const FALL_TYPES = ['Provoked', 'Unprovoked'] as const;

export const ADDICTION_TYPES = ['Drugs', 'Alcohol', 'Tobacco', 'Other'] as const;

export const NON_MOTOR_SYMPTOMS = [
  'Constipation',
  'Urinary urgency / incontinence',
  'Abnormal sweating',
  'Dizziness on getting out of bed',
  'Decreased attention or concentration',
  'Forgetfulness',
  'Anxiety',
  'Sleep problems (delayed sleep / fragmented sleep / excessive daytime sleepiness)',
  'Drooling of saliva',
  'Unnecessary suspicion of family members or people around you',
] as const;

export const DOSE_MODES: Array<{
  key: DoseMode;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    key: 'pages',
    icon: '📄',
    title: 'One question at a time',
    description:
      'Each question on its own screen with a Next button. Easier to focus on one thing at a time.',
  },
  {
    key: 'scroll',
    icon: '📜',
    title: 'All on one scrollable page',
    description:
      'See and fill all dose questions on a single scrollable screen. Quicker if you prefer to see everything at once.',
  },
];
