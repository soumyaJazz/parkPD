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
import type { OtherMedsDraft } from '../../types/dailyLog';
import {
  EMPTY_OTHER_MEDS,
  OTHER_MEDICINES,
  OTHER_MED_OTHER,
  toOtherMeds,
  toggleChoice,
} from '../../types/dailyLog';
import { styles } from './OtherMedsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'OtherMeds'>;

/** The morning, then the doses, then the common questions, then the review. */
const STEP = 3;
const TOTAL_STEPS = 4;

/**
 * The first of the common questions: what else was taken today.
 *
 * Asked once for the whole day rather than once per dose - a blood-pressure
 * tablet is not a property of any one dose of Syndopa - which is why it waits
 * until the doses are done instead of joining the nine questions each of them
 * is put through.
 *
 * Choosing nothing is a complete answer and travels as null: the question has
 * no "none" of its own to press, so Continue never refuses on an empty list.
 */
function OtherMedsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<OtherMedsDraft>(EMPTY_OTHER_MEDS);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof OtherMedsDraft>(
    key: K,
    value: OtherMedsDraft[K],
  ) => {
    setAnswers(previous => ({ ...previous, [key]: value }));
    setError(null);
  };

  const otherPicked = answers.meds.includes(OTHER_MED_OTHER);

  const handleChip = (option: string) => {
    const next = toggleChoice(answers.meds, option);
    set('meds', next);
    // Nothing to keep once the chip that asked for it is gone.
    if (option === OTHER_MED_OTHER && !next.includes(OTHER_MED_OTHER)) {
      set('otherName', '');
    }
  };

  /**
   * The only way this question can be wrong: a chip that promised a name and
   * was not given one. An empty list is an answer, so it is not checked.
   */
  const validate = (): string | null =>
    otherPicked && answers.otherName.trim() === ''
      ? 'Name the other medicine you took'
      : null;

  const handleContinue = () => {
    const missing = validate();
    if (missing !== null) {
      setError(missing);
      showToast('This question still needs an answer', missing, 'warning');
      return;
    }

    // On to the next of the common questions, carrying everything gathered
    // so far the way every step here hands the next what it was given.
    navigation.navigate('SideEffects', {
      ...route.params,
      otherMeds: toOtherMeds(answers),
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
              <Icon name="capsule" size={13} color={feedback.info.fg} />
              <Text style={styles.badgeText}>OTHER MEDICINES</Text>
            </View>

            <Text style={styles.cardTitle}>Other medications</Text>
            <Text style={styles.cardSubtitle}>
              Any other medicines taken today?
            </Text>
            <Text style={styles.hint}>
              Select all that apply. If you took none, leave them all unselected
              and press Continue.
            </Text>

            <ChipGroup
              options={OTHER_MEDICINES}
              selected={answers.meds}
              onToggle={handleChip}
            />

            {otherPicked && (
              <FollowUp label="Which medicine was it?">
                <TextInput
                  style={[
                    styles.otherField,
                    answers.otherName !== '' && styles.otherFieldFilled,
                  ]}
                  value={answers.otherName}
                  onChangeText={value => set('otherName', value)}
                  placeholder="Name the medicine"
                  // Darker than the placeholder colour used elsewhere, which is
                  // barely visible. The field keeps a label above it, so a
                  // readable placeholder can't be taken for something typed.
                  placeholderTextColor={colors.subtext}
                />
              </FollowUp>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Text style={styles.continueNote}>Next: side effects.</Text>
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

export default OtherMedsScreen;
