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
import { ChipGroup, FollowUp } from '../../components/Questionnaire';
import StepHeader from '../../components/StepHeader';
import { showToast } from '../../components/Toast';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, feedback, globalStyles, minInset } from '../../theme';
import type { SideEffectsDraft } from '../../types/dailyLog';
import {
  EMPTY_SIDE_EFFECTS,
  MED_SIDE_EFFECTS,
  SIDE_EFFECT_OTHER,
  toSideEffects,
  toggleChoice,
} from '../../types/dailyLog';
import { styles } from './SideEffectsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'SideEffects'>;

/** The morning, then the doses, then the common questions, then the review. */
const STEP = 3;
const TOTAL_STEPS = 4;

/**
 * The second of the common questions: what the medicines did besides help.
 *
 * Asked of the whole day's medication rather than of any one dose - these build
 * over weeks, not over the four hours a tablet lasts - and it is the reason the
 * question names no dose and offers no time.
 *
 * Nothing selected is an answer, not a gap: a day with no side effects is the
 * day none were picked, which is why Continue never refuses and why the card
 * says so in words rather than leaving the empty state to speak for itself.
 */
function SideEffectsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<SideEffectsDraft>(EMPTY_SIDE_EFFECTS);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SideEffectsDraft>(
    key: K,
    value: SideEffectsDraft[K],
  ) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
    setError(null);
  };

  const otherPicked = answers.effects.includes(SIDE_EFFECT_OTHER);
  const count = answers.effects.length;

  const handleChip = (option: string) => {
    const next = toggleChoice(answers.effects, option);
    set('effects', next);
    // Nothing to keep once the chip that asked for it is gone.
    if (option === SIDE_EFFECT_OTHER && !next.includes(SIDE_EFFECT_OTHER)) {
      set('otherName', '');
    }
  };

  /**
   * The only way this question can be wrong: a chip that promised a description
   * and was not given one. An empty list is an answer, so it is not checked.
   */
  const validate = (): string | null =>
    otherPicked && answers.otherName.trim() === ''
      ? 'Describe the other side effect you noticed'
      : null;

  const handleContinue = () => {
    const missing = validate();
    if (missing !== null) {
      setError(missing);
      showToast('This question still needs an answer', missing, 'warning');
      return;
    }

    // On to the last of the common questions, carrying everything gathered
    // so far the way every step here hands the next what it was given.
    navigation.navigate('NightReview', {
      ...route.params,
      sideEffects: toSideEffects(answers),
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
              <Icon name="bell" size={13} color={feedback.info.fg} />
              <Text style={styles.badgeText}>SIDE EFFECTS</Text>
            </View>

            <Text style={styles.cardTitle}>Side effects</Text>
            <Text style={styles.cardSubtitle}>
              Have you noticed any side effects from your Parkinson’s medicines?
            </Text>
            <Text style={styles.sectionHint}>
              Select all that apply. If you had none, leave them all unselected
              and press Continue.
            </Text>

            <ChipGroup
              options={MED_SIDE_EFFECTS}
              selected={answers.effects}
              onToggle={handleChip}
            />

            {otherPicked && (
              <FollowUp label="What else did you notice?">
                <TextInput
                  style={[
                    styles.otherField,
                    answers.otherName !== '' && styles.otherFieldFilled,
                  ]}
                  value={answers.otherName}
                  onChangeText={value => set('otherName', value)}
                  placeholder="Describe the side effect"
                  // Darker than the placeholder colour used elsewhere, which is
                  // barely visible. The field keeps a label above it, so a
                  // readable placeholder can't be taken for something typed.
                  placeholderTextColor={colors.subtext}
                />
              </FollowUp>
            )}

            {/* Said in words, so the empty answer reads as an answer rather
                than as a question nobody got to. */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {count === 0 ? (
                  'No side effects selected'
                ) : (
                  <>
                    <Text style={styles.summaryCount}>{count}</Text>
                    {` side ${count === 1 ? 'effect' : 'effects'} selected`}
                  </>
                )}
              </Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Text style={styles.continueNote}>Next: your night.</Text>
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

export default SideEffectsScreen;
