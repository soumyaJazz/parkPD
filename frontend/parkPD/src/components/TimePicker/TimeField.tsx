import { Pressable, Text } from 'react-native';
import { formatTime12 } from '../../utils/date';
import type { TimeOfDay } from '../../utils/date';
import { fieldStyles as styles } from './TimePicker.styles';

type Props = {
  value: TimeOfDay;
  onPress: () => void;
  /** What this time is, for the spoken label, e.g. "Wake-up time". */
  label: string;
  disabled?: boolean;
};

/** The reading on the question, and the way into the clock that changes it. */
function TimeField({ value, onPress, label, disabled }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatTime12(value)}, tap to change`}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.time}>{formatTime12(value)}</Text>
      <Text style={styles.action}>Tap to change</Text>
    </Pressable>
  );
}

export default TimeField;
