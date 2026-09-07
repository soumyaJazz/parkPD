import { Pressable, Text, View } from 'react-native';
import {
  ChipGroup,
  FollowUp,
  Note,
  NumberField,
  QuestionCard,
  YesNo,
} from '../Questionnaire';
import type {
  QuestionnaireDraft,
  QuestionnaireErrors,
} from '../../types/questionnaire';
import {
  ADDICTION_TYPES,
  BODY_PARTS,
  DOSE_MODES,
  FALL_TYPES,
  FIRST_SYMPTOMS,
  NON_MOTOR_SYMPTOMS,
  OTHER_BODY_PART,
  withStored,
} from '../../types/questionnaire';
import { ConditionQuestion, NoneBar, TextInputRow } from './parts';
import { styles } from './ProfileQuestionnaire.styles';

/** Adds or removes one option from a multi-select. */
function toggle(list: string[], option: string): string[] {
  return list.includes(option)
    ? list.filter(item => item !== option)
    : [...list, option];
}

type Props = {
  answers: QuestionnaireDraft;
  setAnswers: (
    update: (previous: QuestionnaireDraft) => QuestionnaireDraft,
  ) => void;
  errors: QuestionnaireErrors;
  setErrors: (
    update: (previous: QuestionnaireErrors) => QuestionnaireErrors,
  ) => void;
  /** True while a save is in flight, so nothing can be changed under it. */
  disabled?: boolean;
};

/**
 * The clinical questionnaire: every question, in order, and nothing else.
 *
 * It is asked twice in the life of an account - once at sign-up, and again
 * whenever the profile screen is opened - so it lives here rather than in
 * either screen. The two differ in what surrounds it (a Next button and a
 * carried-forward details half, against a Save and a form already filled in),
 * not in what is asked, and a question worded differently in the two places
 * would be two different questions.
 *
 * It holds no state of its own. Setup keeps its answers in a context above the
 * screen so they survive a trip back to the details; the profile screen keeps
 * its own so it can tell an edited form from an untouched one. Neither could
 * work if the answers lived down here.
 */
export function ProfileQuestionnaire({
  answers,
  setAnswers,
  errors,
  setErrors,
  disabled,
}: Props) {
  /** Records one answer, and clears whatever the question was last told off for. */
  const answer = <K extends keyof QuestionnaireDraft>(
    key: K,
    value: QuestionnaireDraft[K],
    errorKey: string,
  ) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [errorKey]: undefined }));
  };

  const yearsAnswer = (
    key: 'diabetesYears' | 'hypertensionYears' | 'thyroidYears',
    errorKey: string,
  ) => ({
    value: answers[key],
    onChange: (value: string) => answer(key, value, errorKey),
  });

  return (
    <>
      <QuestionCard
        question="How long have you had Parkinson's disease?"
        error={errors.duration}
      >
        <View style={styles.durationRow}>
          <NumberField
            label="Years"
            value={answers.years}
            onChange={value => answer('years', value, 'duration')}
            placeholder="0"
            maxLength={2}
            disabled={disabled}
          />
          <NumberField
            label="Months"
            value={answers.months}
            onChange={value => answer('months', value, 'duration')}
            placeholder="0"
            maxLength={2}
            disabled={disabled}
          />
        </View>
      </QuestionCard>

      <QuestionCard
        question="What were your first symptoms?"
        error={errors.firstSymptom}
      >
        {/* withStored on every list of chips: an answer already on the account
            that this build's list doesn't have would otherwise disappear from
            the screen, and then be dropped by the next save. */}
        <ChipGroup
          options={withStored(FIRST_SYMPTOMS, answers.firstSymptoms)}
          selected={answers.firstSymptoms}
          onToggle={option =>
            answer(
              'firstSymptoms',
              toggle(answers.firstSymptoms, option),
              'firstSymptom',
            )
          }
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="Which parts of your body were first affected?"
        error={errors.bodyPart}
      >
        <ChipGroup
          options={BODY_PARTS}
          selected={answers.bodyParts}
          onToggle={option =>
            answer('bodyParts', toggle(answers.bodyParts, option), 'bodyPart')
          }
          disabled={disabled}
        />
        {answers.bodyParts.includes(OTHER_BODY_PART) && (
          <FollowUp>
            <TextInputRow
              value={answers.bodyPartOther}
              onChange={value => answer('bodyPartOther', value, 'bodyPart')}
              disabled={disabled}
            />
          </FollowUp>
        )}
      </QuestionCard>

      <QuestionCard
        question="Do you have a history of recurrent falls?"
        hint="Recurrent falls means more than 1 fall per year."
        error={errors.falls}
      >
        <YesNo
          value={answers.falls}
          onChange={value => answer('falls', value, 'falls')}
          disabled={disabled}
        />
        {answers.falls === true && (
          <FollowUp label="How many times in the last year?">
            <NumberField
              value={answers.fallsPerYear}
              onChange={value => answer('fallsPerYear', value, 'fallsPerYear')}
              placeholder="3 per year"
              disabled={disabled}
            />
            {errors.fallsPerYear ? (
              <Text style={styles.error}>{errors.fallsPerYear}</Text>
            ) : null}

            <Text style={styles.followUpQuestion}>
              Were the falls provoked or unprovoked?
            </Text>
            <Note
              lines={[
                'Provoked means the fall happened because of a clear outside reason - like tripping on something, slipping, or losing balance while turning quickly. Unprovoked means the fall happened on its own, out of the blue, with no obvious trigger.',
              ]}
            />
            <ChipGroup
              options={withStored(FALL_TYPES, answers.fallsTypes)}
              selected={answers.fallsTypes}
              onToggle={option =>
                answer(
                  'fallsTypes',
                  toggle(answers.fallsTypes, option),
                  'fallsType',
                )
              }
              disabled={disabled}
            />
            {errors.fallsType ? (
              <Text style={styles.error}>{errors.fallsType}</Text>
            ) : null}
          </FollowUp>
        )}
      </QuestionCard>

      <QuestionCard
        question="Do you have any psychiatric illness, or have you ever taken medication for a psychiatric illness?"
        error={errors.psychiatric}
      >
        <YesNo
          value={answers.psychiatric}
          onChange={value => answer('psychiatric', value, 'psychiatric')}
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="Do you have any history of substance abuse (drugs, alcohol or tobacco)?"
        error={errors.addiction}
      >
        <YesNo
          value={answers.addiction}
          onChange={value => answer('addiction', value, 'addiction')}
          disabled={disabled}
        />
        {answers.addiction === true && (
          <FollowUp label="Which of these apply?">
            <ChipGroup
              options={withStored(ADDICTION_TYPES, answers.addictionTypes)}
              selected={answers.addictionTypes}
              onToggle={option =>
                answer(
                  'addictionTypes',
                  toggle(answers.addictionTypes, option),
                  'addictionTypes',
                )
              }
              disabled={disabled}
            />
          </FollowUp>
        )}
      </QuestionCard>

      <QuestionCard
        question="Do you have any history of REM Sleep Behaviour Disorder?"
        error={errors.rem}
      >
        <Note
          title="What is REM Sleep Behaviour Disorder?"
          lines={[
            'During normal sleep, your body is temporarily paralysed so you don’t act out your dreams. In REM Sleep Behaviour Disorder (RBD), this paralysis is incomplete - so people physically move or make sounds while dreaming.',
            { bullet: '🦵 Kicking or thrashing legs during sleep' },
            { bullet: '👊 Punching or flailing arms' },
            { bullet: '🗣️ Talking, shouting or crying out loud' },
            { bullet: '🛌 Falling out of bed' },
            { bullet: '😨 Violent movements noticed by a bed partner' },
            'This is different from restless leg syndrome or sleepwalking.',
          ]}
        />
        <YesNo
          value={answers.rem}
          onChange={value => answer('rem', value, 'rem')}
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="Do you have any of these Non-Motor Symptoms?"
        error={errors.nonMotor}
      >
        <Note lines={['Select all that you experience regularly.']} />
        <ChipGroup
          options={withStored(NON_MOTOR_SYMPTOMS, answers.nonMotor ?? [])}
          selected={answers.nonMotor ?? []}
          onToggle={option =>
            answer('nonMotor', toggle(answers.nonMotor ?? [], option), 'nonMotor')
          }
          disabled={disabled}
        />
        <NoneBar
          active={answers.nonMotor?.length === 0}
          onPress={() => answer('nonMotor', [], 'nonMotor')}
          disabled={disabled}
        />
      </QuestionCard>

      <ConditionQuestion
        question="Do you have a history of Diabetes?"
        has={answers.diabetes}
        onAnswer={value => answer('diabetes', value, 'diabetes')}
        years={yearsAnswer('diabetesYears', 'diabetesYears')}
        error={errors.diabetes}
        yearsError={errors.diabetesYears}
        disabled={disabled}
      />

      <ConditionQuestion
        question="Do you have a history of Hypertension?"
        has={answers.hypertension}
        onAnswer={value => answer('hypertension', value, 'hypertension')}
        years={yearsAnswer('hypertensionYears', 'hypertensionYears')}
        error={errors.hypertension}
        yearsError={errors.hypertensionYears}
        disabled={disabled}
      />

      <ConditionQuestion
        question="Do you have a history of Thyroid disorder?"
        has={answers.thyroid}
        onAnswer={value => answer('thyroid', value, 'thyroid')}
        years={yearsAnswer('thyroidYears', 'thyroidYears')}
        error={errors.thyroid}
        yearsError={errors.thyroidYears}
        disabled={disabled}
      />

      <QuestionCard
        question="Do any of your family members suffer from a similar illness (Parkinson's)?"
        error={errors.familyHistory}
      >
        <YesNo
          value={answers.familyHistory}
          onChange={value => answer('familyHistory', value, 'familyHistory')}
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="Can you walk independently?"
        error={errors.walkIndependent}
      >
        {/* The one question here where "yes" is the reassuring answer. */}
        <YesNo
          value={answers.walkIndependent}
          onChange={value => answer('walkIndependent', value, 'walkIndependent')}
          goodAnswer="yes"
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="Do you need help performing daily activities?"
        error={errors.assistanceNeeded}
      >
        <YesNo
          value={answers.assistanceNeeded}
          onChange={value =>
            answer('assistanceNeeded', value, 'assistanceNeeded')
          }
          disabled={disabled}
        />
      </QuestionCard>

      <QuestionCard
        question="How would you like to log your daily dose information?"
        error={errors.doseMode}
      >
        <Note
          lines={[
            'You’ll be logging things like when you took your dose, how it affected you, and any side effects. Choose whichever feels easier for you.',
          ]}
        />
        {DOSE_MODES.map(option => {
          const isSelected = answers.doseMode === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.modeCard, isSelected && styles.modeCardSelected]}
              onPress={() => answer('doseMode', option.key, 'doseMode')}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>
                  {option.icon}  {option.title}
                </Text>
                {isSelected ? <Text style={styles.modeBadge}>✓</Text> : null}
              </View>
              <Text style={styles.modeDescription}>{option.description}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.footnote}>
          You can change this preference anytime from Profile in the menu.
        </Text>
      </QuestionCard>
    </>
  );
}
