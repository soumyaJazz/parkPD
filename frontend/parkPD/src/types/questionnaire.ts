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

/**
 * One message per question, keyed by the name the form uses for it. Partial
 * because a question with nothing wrong with it has no entry at all, which is
 * what lets `Object.values(...).filter(Boolean)` count the outstanding ones.
 */
export type QuestionnaireErrors = Partial<Record<string, string>>;

/**
 * Everything the questionnaire will refuse to be sent with.
 *
 * `age` is the ceiling on the "for how many years" answers: nothing can have
 * been true for longer than the person has been alive. It comes from the date
 * of birth on the details half of the form, which is why it is passed in rather
 * than read here - during setup that half lives on another screen entirely.
 *
 * Kept beside the draft rather than in either screen because both screens ask
 * these questions: the one that collects them at sign-up, and the one that
 * reopens them later.
 */
export function validateQuestionnaire(
  answers: QuestionnaireDraft,
  age: number,
): QuestionnaireErrors {
  const next: QuestionnaireErrors = {};

  const years = Number(answers.years || 0);
  const months = Number(answers.months || 0);
  if (answers.years === '' && answers.months === '') {
    next.duration = 'Enter how long you have had Parkinson’s disease';
  } else if (months > MAX_MONTHS) {
    next.duration = `Months cannot be more than ${MAX_MONTHS}`;
  } else if (years > age) {
    next.duration = 'This is longer than your age';
  } else if (years === 0 && months === 0) {
    next.duration = 'Enter at least one month';
  }

  if (answers.firstSymptoms.length === 0) {
    next.firstSymptom = 'Select at least one symptom';
  }

  if (answers.bodyParts.length === 0) {
    next.bodyPart = 'Select at least one body part';
  } else if (
    answers.bodyParts.includes(OTHER_BODY_PART) &&
    answers.bodyPartOther.trim() === ''
  ) {
    next.bodyPart = 'Describe the other affected body part';
  }

  if (answers.falls === null) {
    next.falls = 'Select yes or no';
  } else if (answers.falls) {
    // 0 is a legitimate count here, so only a blank field is unanswered.
    if (answers.fallsPerYear === '') {
      next.fallsPerYear = 'Enter how many falls in the last year';
    }
    if (answers.fallsTypes.length === 0) {
      next.fallsType = 'Select provoked, unprovoked, or both';
    }
  }

  if (answers.psychiatric === null) {
    next.psychiatric = 'Select yes or no';
  }

  if (answers.addiction === null) {
    next.addiction = 'Select yes or no';
  }
  // Which substances is deliberately not required: a "yes" with nothing
  // ticked is its own answer, and the server stores it as an empty list.

  if (answers.rem === null) {
    next.rem = 'Select yes or no';
  }

  // Empty is a valid answer here, but only once it has been given: "None of
  // these" has to be chosen, not merely left alone.
  if (answers.nonMotor === null) {
    next.nonMotor = 'Select your symptoms, or choose "None of these"';
  }

  const conditions: Array<[boolean | null, string, string, string]> = [
    [answers.diabetes, answers.diabetesYears, 'diabetes', 'diabetesYears'],
    [
      answers.hypertension,
      answers.hypertensionYears,
      'hypertension',
      'hypertensionYears',
    ],
    [answers.thyroid, answers.thyroidYears, 'thyroid', 'thyroidYears'],
  ];
  conditions.forEach(([has, years_, key, yearsKey]) => {
    if (has === null) {
      next[key] = 'Select yes or no';
    } else if (has) {
      if (years_ === '') {
        next[yearsKey] = 'Enter how many years';
      } else if (Number(years_) > age) {
        next[yearsKey] = 'This is longer than your age';
      }
    }
  });

  if (answers.familyHistory === null) {
    next.familyHistory = 'Select yes or no';
  }
  if (answers.walkIndependent === null) {
    next.walkIndependent = 'Select yes or no';
  }
  if (answers.assistanceNeeded === null) {
    next.assistanceNeeded = 'Select yes or no';
  }
  if (answers.doseMode === null) {
    next.doseMode = 'Choose how you would like to be asked';
  }

  return next;
}

/** 0/1 is what the server stores for every yes/no here. */
function flag(value: boolean): Flag {
  return value ? 1 : 0;
}

/**
 * The draft as it is sent. Only call it on a draft `validateQuestionnaire` had
 * nothing to say about - the nulls below are answers, not gaps, and this cannot
 * tell the two apart.
 */
export function toQuestionnaireAnswers(
  answers: QuestionnaireDraft,
): QuestionnaireAnswers {
  return {
    // Years and months are two fields on screen and one number on the wire.
    p_duration: Number(answers.years || 0) * 12 + Number(answers.months || 0),
    first_symptom: answers.firstSymptoms,
    // "Other" is a prompt, not an answer: what was typed takes its place, so
    // the array is a list of body parts the whole way through.
    first_affected_part: answers.bodyParts.flatMap(part =>
      part === OTHER_BODY_PART ? [answers.bodyPartOther.trim()] : [part],
    ),
    // The count carries the yes/no. Null is "no history of falls"; 0 would say
    // the opposite - a history, with none in the last year.
    recc_falls: answers.falls ? Number(answers.fallsPerYear) : null,
    recc_falls_type: answers.falls ? answers.fallsTypes : null,
    psychiatric: flag(answers.psychiatric === true),
    // Same shape: the list is the answer, and null is "no history".
    addiction: answers.addiction ? answers.addictionTypes : null,
    rem: flag(answers.rem === true),
    non_motor_symptoms: answers.nonMotor ?? [],
    // Null, not 0: "no diabetes" and "diabetes for under a year" are different
    // answers and 0 already means the second.
    diabetes_yrs: answers.diabetes ? Number(answers.diabetesYears) : null,
    hypertension_yrs: answers.hypertension
      ? Number(answers.hypertensionYears)
      : null,
    thyroid_yrs: answers.thyroid ? Number(answers.thyroidYears) : null,
    family_p_history: flag(answers.familyHistory === true),
    walk_independent: flag(answers.walkIndependent === true),
    assistance_needed: flag(answers.assistanceNeeded === true),
    // Narrowed by the validation above, which refuses a draft that hasn't been
    // asked this. The fallback is what makes that a type the compiler accepts.
    dose_mode: answers.doseMode ?? 'pages',
  };
}

/** A stored count of years as the form holds it: text, and '' for "no". */
function yearsText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * A saved profile, back in the shape the form edits.
 *
 * The inverse of `toQuestionnaireAnswers`, and the reason the edit screen needs
 * no fetch of its own: the account is already in hand, and this turns it into
 * a filled-in form.
 *
 * Anything the account has no answer for is left as the empty draft has it -
 * unanswered - so a profile saved before a question existed opens with that one
 * question blank rather than with a value nobody gave.
 */
export function toQuestionnaireDraft(
  saved: Partial<QuestionnaireAnswers>,
): QuestionnaireDraft {
  const months = saved.p_duration ?? null;

  // Whatever isn't one of the body parts we offer is what was typed into
  // "Other". More than one can only come from a list that has since changed, so
  // they are joined rather than dropped - losing an answer is the worse end.
  const storedParts = saved.first_affected_part ?? [];
  const known = storedParts.filter(part =>
    (BODY_PARTS as readonly string[]).includes(part),
  );
  const typed = storedParts.filter(
    part => !(BODY_PARTS as readonly string[]).includes(part),
  );

  return {
    years: months === null ? '' : String(Math.floor(months / 12)),
    months: months === null ? '' : String(months % 12),
    firstSymptoms: saved.first_symptom ?? [],
    bodyParts: typed.length > 0 ? [...known, OTHER_BODY_PART] : known,
    bodyPartOther: typed.join(', '),
    falls: saved.recc_falls === undefined ? null : saved.recc_falls !== null,
    fallsPerYear: yearsText(saved.recc_falls),
    fallsTypes: saved.recc_falls_type ?? [],
    psychiatric: saved.psychiatric === undefined ? null : saved.psychiatric === 1,
    addiction: saved.addiction === undefined ? null : saved.addiction !== null,
    addictionTypes: saved.addiction ?? [],
    rem: saved.rem === undefined ? null : saved.rem === 1,
    nonMotor: saved.non_motor_symptoms ?? null,
    diabetes: saved.diabetes_yrs === undefined ? null : saved.diabetes_yrs !== null,
    diabetesYears: yearsText(saved.diabetes_yrs),
    hypertension:
      saved.hypertension_yrs === undefined ? null : saved.hypertension_yrs !== null,
    hypertensionYears: yearsText(saved.hypertension_yrs),
    thyroid: saved.thyroid_yrs === undefined ? null : saved.thyroid_yrs !== null,
    thyroidYears: yearsText(saved.thyroid_yrs),
    familyHistory:
      saved.family_p_history === undefined ? null : saved.family_p_history === 1,
    walkIndependent:
      saved.walk_independent === undefined ? null : saved.walk_independent === 1,
    assistanceNeeded:
      saved.assistance_needed === undefined ? null : saved.assistance_needed === 1,
    doseMode: saved.dose_mode ?? null,
  };
}

/**
 * The options to draw, with anything already answered added to the end.
 *
 * A stored answer that isn't on the list any more - a symptom since renamed,
 * or one a newer form offers and this build doesn't know - would otherwise
 * vanish from the screen and then be dropped on the next save. Showing it means
 * the only way to remove an answer is to remove it.
 */
export function withStored(
  options: readonly string[],
  selected: readonly string[],
): readonly string[] {
  const extra = selected.filter(value => !options.includes(value));
  return extra.length === 0 ? options : [...options, ...extra];
}
