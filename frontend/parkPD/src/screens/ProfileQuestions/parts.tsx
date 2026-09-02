import { Text, TextInput, View } from 'react-native';
import { Pressable } from 'react-native';
import {
  FollowUp,
  NumberField,
  QuestionCard,
  YesNo,
} from '../../components/Questionnaire';
import { colors } from '../../theme';
import { styles } from './ProfileQuestionsScreen.styles';

/** The free-text field revealed by the "Other" body-part chip. */
export function TextInputRow({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <TextInput
      style={[styles.textField, value !== '' && styles.textFieldFilled]}
      value={value}
      onChangeText={onChange}
      placeholder="Describe affected body part..."
      placeholderTextColor={colors.border}
      editable={!disabled}
    />
  );
}

/**
 * The escape hatch under a symptom list. It is a state, not a toggle: it reads
 * as chosen whenever nothing else is, so "none" is never left ambiguous with
 * "not answered yet".
 */
export function NoneBar({
  active,
  onPress,
  disabled,
}: {
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.noneBar, active && styles.noneBarActive]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.noneBarText, active && styles.noneBarTextActive]}>
        ✓  None of these
      </Text>
    </Pressable>
  );
}

/**
 * Diabetes, hypertension and thyroid are asked identically - a yes/no, then
 * how long - so the three share one component rather than three copies.
 */
export function ConditionQuestion({
  question,
  has,
  onAnswer,
  years,
  error,
  yearsError,
  disabled,
}: {
  question: string;
  has: boolean | null;
  onAnswer: (value: boolean) => void;
  years: { value: string; onChange: (value: string) => void };
  error?: string;
  yearsError?: string;
  disabled?: boolean;
}) {
  return (
    <QuestionCard question={question} error={error}>
      <YesNo value={has} onChange={onAnswer} disabled={disabled} />
      {has === true && (
        <>
          <View style={styles.divider} />
          <Text style={styles.eyebrow}>For how many years?</Text>
          <NumberField
            value={years.value}
            onChange={years.onChange}
            placeholder="0"
            suffix="years"
            tinted
            disabled={disabled}
          />
          {yearsError ? <Text style={styles.error}>{yearsError}</Text> : null}
        </>
      )}
    </QuestionCard>
  );
}

export { FollowUp };
