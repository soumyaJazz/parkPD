import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { completeProfile } from '../../api';
import {
  ChipGroup,
  FollowUp,
  Note,
  NumberField,
  QuestionCard,
  YesNo,
} from '../../components/Questionnaire';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSetupDraft } from '../../context/SetupDraftContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, minInset } from '../../theme';
import type { Flag, QuestionnaireDraft } from '../../types/questionnaire';
import {
  ADDICTION_TYPES,
  BODY_PARTS,
  DOSE_MODES,
  FALL_TYPES,
  FIRST_SYMPTOMS,
  MAX_MONTHS,
  NON_MOTOR_SYMPTOMS,
  OTHER_BODY_PART,
} from '../../types/questionnaire';
import { dobToAge } from '../../utils/dob';
import { ConditionQuestion, NoneBar, TextInputRow } from './parts';
import { styles } from './ProfileQuestionsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileQuestions'>;


type Errors = Partial<Record<string, string>>;

/** 0/1 is what the server stores for every yes/no here. */
function flag(value: boolean): Flag {
  return value ? 1 : 0;
}

/** Adds or removes one option from a multi-select. */
function toggle(list: string[], option: string): string[] {
  return list.includes(option)
    ? list.filter(item => item !== option)
    : [...list, option];
}

function ProfileQuestionsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();
  // Held above this screen: a phone number already on another account is only
  // rejected at save time, and fixing it means stepping back to the details -
  // which unmounts this screen. The answers have to outlive that.
  const { draft: answers, setDraft: setAnswers, clearDraft } = useSetupDraft();
  const { details } = route.params;
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A condition can't have been present for longer than the person has lived,
  // so their age is the ceiling on every "for how many years" answer.
  const age = dobToAge(details.dob) ?? 0;

  const set = <K extends keyof QuestionnaireDraft>(
    key: K,
    value: QuestionnaireDraft[K],
  ) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
  };

  /** Clears one question's error as soon as it is answered. */
  const answer = <K extends keyof QuestionnaireDraft>(
    key: K,
    value: QuestionnaireDraft[K],
    errorKey: string,
  ) => {
    set(key, value);
    setErrors(previous => ({ ...previous, [errorKey]: undefined }));
  };

  const yearsAnswer = (
    key: 'diabetesYears' | 'hypertensionYears' | 'thyroidYears',
    errorKey: string,
  ) => ({
    value: answers[key],
    onChange: (value: string) => answer(key, value, errorKey),
  });

  const validate = (): Errors => {
    const next: Errors = {};

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
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const found = validate();
    setErrors(found);
    const unanswered = Object.values(found).filter(Boolean).length;
    if (unanswered > 0 || answers.doseMode === null) {
      showToast(
        unanswered === 1
          ? 'One question still needs an answer'
          : `${unanswered} questions still need an answer`,
        'They are marked in red below.',
        'warning',
      );
      return;
    }

    // "Other" is a prompt, not an answer: what was typed takes its place, so
    // the array is a list of body parts the whole way through.
    const bodyParts = answers.bodyParts.flatMap(part =>
      part === OTHER_BODY_PART ? [answers.bodyPartOther.trim()] : [part],
    );

    setIsSubmitting(true);
    try {
      const { data, message } = await completeProfile({
        ...details,
        // Years and months are two fields on screen and one number on the wire.
        p_duration: Number(answers.years || 0) * 12 + Number(answers.months || 0),
        first_symptom: answers.firstSymptoms,
        first_affected_part: bodyParts,
        // The count carries the yes/no. Null is "no history of falls"; 0 would
        // say the opposite - a history, with none in the last year.
        recc_falls: answers.falls ? Number(answers.fallsPerYear) : null,
        recc_falls_type: answers.falls ? answers.fallsTypes : null,
        psychiatric: flag(answers.psychiatric === true),
        // Same shape: the list is the answer, and null is "no history".
        addiction: answers.addiction ? answers.addictionTypes : null,
        rem: flag(answers.rem === true),
        non_motor_symptoms: answers.nonMotor ?? [],
        // Null, not 0: "no diabetes" and "diabetes for under a year" are
        // different answers and 0 already means the second.
        diabetes_yrs: answers.diabetes ? Number(answers.diabetesYears) : null,
        hypertension_yrs: answers.hypertension
          ? Number(answers.hypertensionYears)
          : null,
        thyroid_yrs: answers.thyroid ? Number(answers.thyroidYears) : null,
        family_p_history: flag(answers.familyHistory === true),
        walk_independent: flag(answers.walkIndependent === true),
        assistance_needed: flag(answers.assistanceNeeded === true),
        dose_mode: answers.doseMode,
      });
      showToast('Profile saved', message);
      // Saved, so the held answers are spent - a later sign-in on this device
      // should start from an empty form, not this one.
      clearDraft();
      // The saved account comes back carrying profileCompletedAt, which is what
      // the navigator branches on - handing it to the context is what moves the
      // app past setup. No navigation call: this screen unmounts with the
      // branch that mounted it.
      updateUser(data.user);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Could not save your answers. Please try again.';
      showToast(message, undefined, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          globalStyles.screen,
          {
            paddingTop: Math.max(minInset.top, insets.top),
            paddingBottom: Math.max(minInset.bottom, insets.bottom),
          },
        ]}
      >
        <ScrollView
          style={globalStyles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={styles.chevron} />
          </TouchableOpacity>

          <Text style={globalStyles.title}>A few health questions</Text>
          <Text style={[globalStyles.subtext, styles.subtext]}>
            These help us tailor parkPD to you. Take your time - there are no
            wrong answers.
          </Text>

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
                disabled={isSubmitting}
              />
              <NumberField
                label="Months"
                value={answers.months}
                onChange={value => answer('months', value, 'duration')}
                placeholder="0"
                maxLength={2}
                disabled={isSubmitting}
              />
            </View>
          </QuestionCard>

          <QuestionCard
            question="What were your first symptoms?"
            error={errors.firstSymptom}
          >
            <ChipGroup
              options={FIRST_SYMPTOMS}
              selected={answers.firstSymptoms}
              onToggle={option =>
                answer(
                  'firstSymptoms',
                  toggle(answers.firstSymptoms, option),
                  'firstSymptom',
                )
              }
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {answers.bodyParts.includes(OTHER_BODY_PART) && (
              <FollowUp>
                <TextInputRow
                  value={answers.bodyPartOther}
                  onChange={value => answer('bodyPartOther', value, 'bodyPart')}
                  disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {answers.falls === true && (
              <FollowUp label="How many times in the last year?">
                <NumberField
                  value={answers.fallsPerYear}
                  onChange={value => answer('fallsPerYear', value, 'fallsPerYear')}
                  placeholder="3 per year"
                  disabled={isSubmitting}
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
                  options={FALL_TYPES}
                  selected={answers.fallsTypes}
                  onToggle={option =>
                    answer(
                      'fallsTypes',
                      toggle(answers.fallsTypes, option),
                      'fallsType',
                    )
                  }
                  disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </QuestionCard>

          <QuestionCard
            question="Do you have any history of substance abuse (drugs, alcohol or tobacco)?"
            error={errors.addiction}
          >
            <YesNo
              value={answers.addiction}
              onChange={value => answer('addiction', value, 'addiction')}
              disabled={isSubmitting}
            />
            {answers.addiction === true && (
              <FollowUp label="Which of these apply?">
                <ChipGroup
                  options={ADDICTION_TYPES}
                  selected={answers.addictionTypes}
                  onToggle={option =>
                    answer(
                      'addictionTypes',
                      toggle(answers.addictionTypes, option),
                      'addictionTypes',
                    )
                  }
                  disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </QuestionCard>

          <QuestionCard
            question="Do you have any of these Non-Motor Symptoms?"
            error={errors.nonMotor}
          >
            <Note lines={['Select all that you experience regularly.']} />
            <ChipGroup
              options={NON_MOTOR_SYMPTOMS}
              selected={answers.nonMotor ?? []}
              onToggle={option =>
                answer(
                  'nonMotor',
                  toggle(answers.nonMotor ?? [], option),
                  'nonMotor',
                )
              }
              disabled={isSubmitting}
            />
            <NoneBar
              active={answers.nonMotor?.length === 0}
              onPress={() => answer('nonMotor', [], 'nonMotor')}
              disabled={isSubmitting}
            />
          </QuestionCard>

          <ConditionQuestion
            question="Do you have a history of Diabetes?"
            has={answers.diabetes}
            onAnswer={value => answer('diabetes', value, 'diabetes')}
            years={yearsAnswer('diabetesYears', 'diabetesYears')}
            error={errors.diabetes}
            yearsError={errors.diabetesYears}
            disabled={isSubmitting}
          />

          <ConditionQuestion
            question="Do you have a history of Hypertension?"
            has={answers.hypertension}
            onAnswer={value => answer('hypertension', value, 'hypertension')}
            years={yearsAnswer('hypertensionYears', 'hypertensionYears')}
            error={errors.hypertension}
            yearsError={errors.hypertensionYears}
            disabled={isSubmitting}
          />

          <ConditionQuestion
            question="Do you have a history of Thyroid disorder?"
            has={answers.thyroid}
            onAnswer={value => answer('thyroid', value, 'thyroid')}
            years={yearsAnswer('thyroidYears', 'thyroidYears')}
            error={errors.thyroid}
            yearsError={errors.thyroidYears}
            disabled={isSubmitting}
          />

          <QuestionCard
            question="Do any of your family members suffer from a similar illness (Parkinson's)?"
            error={errors.familyHistory}
          >
            <YesNo
              value={answers.familyHistory}
              onChange={value => answer('familyHistory', value, 'familyHistory')}
              disabled={isSubmitting}
            />
          </QuestionCard>

          <QuestionCard
            question="Can you walk independently?"
            error={errors.walkIndependent}
          >
            {/* The one question here where "yes" is the reassuring answer. */}
            <YesNo
              value={answers.walkIndependent}
              onChange={value =>
                answer('walkIndependent', value, 'walkIndependent')
              }
              goodAnswer="yes"
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.modeHeader}>
                    <Text style={styles.modeTitle}>
                      {option.icon}  {option.title}
                    </Text>
                    {isSelected ? (
                      <Text style={styles.modeBadge}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.modeDescription}>
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.footnote}>
              You can change this preference anytime in Settings.
            </Text>
          </QuestionCard>

          <TouchableOpacity
            style={[globalStyles.button, globalStyles.buttonReady, styles.submit]}
            onPress={() => {
              handleSubmit();
            }}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonText}>
              {isSubmitting ? 'Saving...' : 'Finish setup'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export default ProfileQuestionsScreen;
