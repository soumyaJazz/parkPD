import { useState } from 'react';
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
import Icon from '../../components/Icon';
import {
  AnswerStack,
  ChipGroup,
  FollowUp,
  YesNo,
} from '../../components/Questionnaire';
import type { Answer } from '../../components/Questionnaire';
import StepHeader from '../../components/StepHeader';
import { showToast } from '../../components/Toast';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, feedback, globalStyles, minInset } from '../../theme';
import type { NightReviewDraft } from '../../types/dailyLog';
import {
  EMPTY_NIGHT_REVIEW,
  NIGHT_SYMPTOMS,
  NIGHT_SYMPTOM_OTHER,
  collapseNight,
  toNightReview,
  toggleChoice,
} from '../../types/dailyLog';
import { WakeCountTiles } from './parts';
import { styles } from './NightReviewScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'NightReview'>;

/** The morning, then the doses, then the common questions, then the review. */
const STEP = 3;
const TOTAL_STEPS = 4;

/** Which way the last question was answered, in the words it was asked in. */
type Troublesome = 'troublesome' | 'manageable';

/**
 * The mark says which answer this is, yes or no; the colour says how the night
 * went. Neither carries the meaning on its own - the sentence does.
 */
const TROUBLE_ANSWERS: ReadonlyArray<Answer<Troublesome>> = [
  {
    value: 'troublesome',
    mark: '✓',
    label: 'Yes, quite troublesome',
    tone: 'bad',
  },
  { value: 'manageable', mark: '✗', label: 'No, manageable', tone: 'good' },
];

/**
 * The last of the common questions: how the night went.
 *
 * Four questions on one card rather than four screens, because three of them
 * exist only depending on the one above - a night that is not broken is never
 * asked how often it breaks - and because they are all about the same night.
 * Splitting them up would mean answering a follow-up to a question that had
 * scrolled away.
 *
 * Answering back out of a branch clears what the branch collected; see
 * `collapseNight`.
 */
function NightReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] =
    useState<NightReviewDraft>(EMPTY_NIGHT_REVIEW);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NightReviewDraft>(
    key: K,
    value: NightReviewDraft[K],
  ) => {
    // Collapsed on every change, so a "no" higher up always takes the answers
    // below it with it rather than leaving them to be sent unasked.
    setAnswers(previous => collapseNight({ ...previous, [key]: value }));
    setError(null);
  };

  const wakes = answers.wakesAtNight === true;
  const hasSymptoms = answers.hasSymptoms === true;
  const othersPicked = answers.symptoms.includes(NIGHT_SYMPTOM_OTHER);

  const handleChip = (option: string) => {
    const next = toggleChoice(answers.symptoms, option);
    set('symptoms', next);
    // Nothing to keep once the chip that asked for it is gone.
    if (option === NIGHT_SYMPTOM_OTHER && !next.includes(NIGHT_SYMPTOM_OTHER)) {
      set('symptomOther', '');
    }
  };

  /** What is still missing, in the order the questions are asked. */
  const validate = (): string | null => {
    if (answers.wakesAtNight === null) {
      return 'Choose yes or no for waking up at night';
    }
    if (!wakes) {
      return null;
    }
    if (answers.wakeCount === null) {
      return 'Choose how many times you typically wake up';
    }
    if (answers.hasSymptoms === null) {
      return 'Choose yes or no for symptoms when you wake up';
    }
    if (!hasSymptoms) {
      return null;
    }
    // Saying yes is a claim that there were some, so at least one has to be
    // named - otherwise the answer is indistinguishable from having said no.
    if (answers.symptoms.length === 0) {
      return 'Choose at least one symptom you notice at night';
    }
    if (othersPicked && answers.symptomOther.trim() === '') {
      return 'Describe the other symptom you notice';
    }
    if (answers.troublesome === null) {
      return 'Choose one of the two answers about your sleep';
    }
    return null;
  };

  const handleContinue = () => {
    const missing = validate();
    if (missing !== null) {
      setError(missing);
      showToast('This question still needs an answer', missing, 'warning');
      return;
    }

    // The last of the questions is answered, so what is left is to look the
    // day over and send it.
    navigation.navigate('Review', {
      ...route.params,
      night: toNightReview(answers),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
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
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <StepHeader
            step={STEP}
            totalSteps={TOTAL_STEPS}
            title="Common questions"
            subtitle="A few questions about the whole day, now that your doses are logged."
            onBack={navigation.goBack}
          />

          <View style={styles.card}>
            <View style={styles.badge}>
              <Icon name="clock" size={13} color={feedback.info.fg} />
              <Text style={styles.badgeText}>NIGHT REVIEW</Text>
            </View>

            <Text style={styles.cardTitle}>Night review</Text>
            <Text style={styles.cardSubtitle}>Tell us about your sleep.</Text>

            <View style={wakes ? styles.block : styles.blockLast}>
              <Text style={styles.qText}>
                Do you have to wake up in the middle of the night to use the
                washroom, or for any other reason?
              </Text>
              <Text style={styles.qHelper}>
                Think about most nights, not one unusual one.
              </Text>
              <YesNo
                value={answers.wakesAtNight}
                onChange={value => set('wakesAtNight', value)}
              />
            </View>

            {wakes && (
              <>
                <View style={styles.divider} />

                <View style={styles.block}>
                  <Text style={styles.qText}>
                    How many times do you typically wake up?
                  </Text>
                  <WakeCountTiles
                    value={answers.wakeCount}
                    onChange={value => set('wakeCount', value)}
                  />
                </View>

                <View style={styles.divider} />

                <View style={hasSymptoms ? styles.block : styles.blockLast}>
                  <Text style={styles.qText}>
                    Do you experience any symptoms when you wake up at night?
                  </Text>
                  <Text style={styles.qHelper}>
                    For example: stiffness, tremor, or difficulty getting out of
                    bed.
                  </Text>
                  <YesNo
                    value={answers.hasSymptoms}
                    onChange={value => set('hasSymptoms', value)}
                  />

                  {hasSymptoms && (
                    <FollowUp label="Which symptoms?">
                      <ChipGroup
                        options={NIGHT_SYMPTOMS}
                        selected={answers.symptoms}
                        onToggle={handleChip}
                      />
                      {othersPicked && (
                        <TextInput
                          style={[
                            styles.otherField,
                            answers.symptomOther !== '' &&
                              styles.otherFieldFilled,
                          ]}
                          value={answers.symptomOther}
                          onChangeText={value => set('symptomOther', value)}
                          placeholder="Describe the symptom"
                          // Darker than the placeholder colour used elsewhere,
                          // which is barely visible. The chips above name what
                          // this is for, so a readable placeholder can't be
                          // taken for something already typed.
                          placeholderTextColor={colors.subtext}
                        />
                      )}
                    </FollowUp>
                  )}
                </View>
              </>
            )}

            {wakes && hasSymptoms && (
              <>
                <View style={styles.divider} />

                <View style={styles.blockLast}>
                  <Text style={styles.qText}>
                    Are these night-time symptoms troublesome?
                  </Text>
                  <Text style={styles.qHelper}>
                    Do they disturb your sleep, or make it hard to get back to
                    bed?
                  </Text>
                  <AnswerStack
                    options={TROUBLE_ANSWERS}
                    value={
                      answers.troublesome === null
                        ? null
                        : answers.troublesome
                        ? 'troublesome'
                        : 'manageable'
                    }
                    onChange={value =>
                      set('troublesome', value === 'troublesome')
                    }
                  />
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Text style={styles.continueNote}>Next: your review.</Text>
          <TouchableOpacity
            style={[globalStyles.button, globalStyles.buttonReady]}
            onPress={handleContinue}
            accessibilityRole="button"
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export default NightReviewScreen;
