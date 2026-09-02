import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AnswerStack,
  ChipGroup,
  FollowUp,
  QuestionCard,
  Scale,
} from '../../components/Questionnaire';
import type { Answer } from '../../components/Questionnaire';
import TimePicker, { TimeField } from '../../components/TimePicker';
import { showToast } from '../../components/Toast';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, globalStyles, minInset } from '../../theme';
import type { DailyActivities, MorningCheckDraft } from '../../types/dailyLog';
import {
  EMPTY_MORNING_CHECK,
  INDEPENDENCE,
  MORNING_SYMPTOMS,
  MORNING_SYMPTOM_OTHER,
  selectedMorningSymptoms,
  toggleMorningSymptom,
} from '../../types/dailyLog';
import { formatFullDate, parseDayKey } from '../../utils/date';
import { styles } from './MorningCheckScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'MorningCheck'>;

type Errors = Partial<Record<'symptoms' | 'dailyActivities', string>>;

/** The morning check, then the doses, then the rest, then a look back at all three. */
const STEP = 1;
const TOTAL_STEPS = 4;

/**
 * The mark says which answer this is, yes or no; the colour says how the day
 * went. Neither carries the meaning on its own - the sentence does.
 */
const DAILY_ACTIVITY_ANSWERS: ReadonlyArray<Answer<DailyActivities>> = [
  {
    value: 'limited',
    mark: '✓',
    label: 'Yes, I was not able to do work',
    tone: 'bad',
  },
  {
    value: 'functional',
    mark: '✗',
    label: 'No, I was functional',
    tone: 'good',
  },
];

/**
 * The first part of a day's log: how the morning started, before any medication.
 *
 * Four questions on one scrolling screen rather than four screens. They are
 * about the same few minutes of the same morning, and the fourth quotes the
 * third back at the user - splitting them up would mean answering a question
 * about a number that had scrolled off into a previous screen.
 */
function MorningCheckScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<MorningCheckDraft>(
    EMPTY_MORNING_CHECK,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [isClockOpen, setClockOpen] = useState(false);

  const day = useMemo(() => parseDayKey(route.params.date), [route.params.date]);

  const set = <K extends keyof MorningCheckDraft>(
    key: K,
    value: MorningCheckDraft[K],
  ) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
  };

  /** Clears one question's error as soon as it is answered. */
  const answer = <K extends keyof MorningCheckDraft>(
    key: K,
    value: MorningCheckDraft[K],
    errorKey: keyof Errors,
  ) => {
    set(key, value);
    setErrors(previous => ({ ...previous, [errorKey]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};

    // The time and the scale both open on a value, so neither can be
    // unanswered - only these two can.
    if (answers.symptoms === null) {
      next.symptoms = 'Choose what you noticed, or choose "None"';
    } else if (
      answers.symptoms.includes(MORNING_SYMPTOM_OTHER) &&
      answers.symptomOther.trim() === ''
    ) {
      next.symptoms = 'Describe what else you noticed';
    }

    if (answers.dailyActivities === null) {
      next.dailyActivities = 'Choose one of the two answers';
    }

    return next;
  };

  const handleContinue = () => {
    const found = validate();
    setErrors(found);

    const unanswered = Object.values(found).filter(Boolean).length;
    if (unanswered > 0) {
      showToast(
        unanswered === 1
          ? 'One question still needs an answer'
          : `${unanswered} questions still need an answer`,
        'They are marked in red below.',
        'warning',
      );
      return;
    }

    // TODO(daily log): open the dose questions for this day, carrying
    // `toMorningCheck(answers)`. Until that screen exists the press still
    // answers, rather than doing nothing.
    showToast(
      'Dose questions are not ready yet',
      'Your morning answers are saved on this screen. The next part is still being built.',
      'info',
    );
  };

  const otherPicked =
    answers.symptoms?.includes(MORNING_SYMPTOM_OTHER) === true;

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

          <Text style={styles.stepLabel}>{`Step ${STEP} of ${TOTAL_STEPS}`}</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(STEP / TOTAL_STEPS) * 100}%` },
              ]}
            />
          </View>

          <Text style={globalStyles.title}>Morning check</Text>
          <Text style={styles.dateLine}>
            {`How ${formatFullDate(day)} started, before your first dose.`}
          </Text>

          <QuestionCard
            question="At what time did you wake up?"
            hint="It starts at 7:00 AM. Tap the time to change it to when you actually woke up."
          >
            <TimeField
              value={answers.wakeTime}
              onPress={() => setClockOpen(true)}
              label="Wake-up time"
            />
          </QuestionCard>

          <QuestionCard
            question="After waking up, did you notice any of these?"
            hint="Select all that apply. Choosing “None” clears the rest."
            error={errors.symptoms}
          >
            <ChipGroup
              options={MORNING_SYMPTOMS}
              selected={selectedMorningSymptoms(answers.symptoms)}
              onToggle={option =>
                answer(
                  'symptoms',
                  toggleMorningSymptom(answers.symptoms, option),
                  'symptoms',
                )
              }
            />
            {otherPicked && (
              <FollowUp label="What else did you notice?">
                <TextInput
                  style={[
                    styles.textField,
                    answers.symptomOther !== '' && styles.textFieldFilled,
                  ]}
                  value={answers.symptomOther}
                  onChangeText={value =>
                    answer('symptomOther', value, 'symptoms')
                  }
                  placeholder="Please describe what you noticed..."
                  // Darker than the placeholder colour used elsewhere in the
                  // app, which is barely visible on white. The field keeps a
                  // label above it, so a readable placeholder can't be taken
                  // for something already typed.
                  placeholderTextColor={colors.subtext}
                />
              </FollowUp>
            )}
          </QuestionCard>

          <QuestionCard
            question="How much of your usual morning activities were you able to do on your own before taking your medication?"
            hint="Drag the bar, press − or +, or tap the number and type it."
          >
            <Scale
              value={answers.independence}
              onChange={value => set('independence', value)}
              min={INDEPENDENCE.min}
              max={INDEPENDENCE.max}
              step={INDEPENDENCE.step}
              minLabel="Fully dependent"
              maxLabel="Fully independent"
              accessibilityLabel="How much of your usual morning activities you could do on your own, as a percentage"
            />
          </QuestionCard>

          {/* The number from the question above is quoted back, so the two read
              as one thought rather than as two unrelated questions. */}
          <QuestionCard
            question={`At ${answers.independence}% level, was your activity of daily living affected?`}
            hint="Before your first dose today, did your Parkinson’s symptoms limit what you could do day-to-day?"
            error={errors.dailyActivities}
          >
            <AnswerStack
              options={DAILY_ACTIVITY_ANSWERS}
              value={answers.dailyActivities}
              onChange={value => answer('dailyActivities', value, 'dailyActivities')}
            />
          </QuestionCard>

          <TouchableOpacity
            style={[
              globalStyles.button,
              globalStyles.buttonReady,
              styles.continue,
            ]}
            onPress={handleContinue}
            accessibilityRole="button"
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonText}>Continue</Text>
          </TouchableOpacity>
          <Text style={styles.continueNote}>
            Next: your doses. Nothing is sent until you have reviewed all your
            answers at the end.
          </Text>
        </ScrollView>
      </View>

      <TimePicker
        visible={isClockOpen}
        value={answers.wakeTime}
        title="SELECT WAKE-UP TIME"
        onSelect={value => set('wakeTime', value)}
        onClose={() => setClockOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

export default MorningCheckScreen;
