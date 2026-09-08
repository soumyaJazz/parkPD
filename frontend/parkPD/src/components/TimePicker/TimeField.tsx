import { Pressable, Text } from 'react-native';
import { formatTime12 } from '../../utils/date';
import type { TimeOfDay } from '../../utils/date';
import { fieldStyles as styles } from './TimePicker.styles';

type Props = {
  /** Null where the question opens unanswered. */
  value: TimeOfDay | null;
  onPress: () => void;
  /** What this time is, for the spoken label, e.g. "Wake-up time". */
  label: string;
  disabled?: boolean;
};

/** The reading on the question, and the way into the clock that changes it. */
function TimeField({ value, onPress, label, disabled }: Props) {
  const isEmpty = value === null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.field,
        isEmpty && styles.fieldEmpty,
        pressed && styles.fieldPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        isEmpty
          ? `${label}, not set yet, tap to choose a time`
          : `${label}, ${formatTime12(value)}, tap to change`
      }
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.time, isEmpty && styles.timeEmpty]}>
        {isEmpty ? 'Select time' : formatTime12(value)}
      </Text>
      <Text style={styles.action}>{isEmpty ? 'Tap to choose' : 'Tap to change'}</Text>
    </Pressable>
  );
}

export default TimeField;
