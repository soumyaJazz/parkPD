import { Text, TextInput, View } from 'react-native';
import { formatDuration } from '../../utils/date';
import { durationStyles as styles } from './Questionnaire.styles';

type Props = {
  hours: string;
  minutes: string;
  onChange: (next: { hours: string; minutes: string }) => void;
  /** A span inside one day, so the hours stop short of a second one. */
  maxHours: number;
  disabled?: boolean;
};

/** Total minutes in the two fields, treating blank as nought. */
export function totalMinutes(hours: string, minutes: string): number {
  return Number(hours || 0) * 60 + Number(minutes || 0);
}

/**
 * Hours and minutes, said back as one phrase.
 *
 * Typing 75 into minutes is a perfectly natural thing to do, and "75 mins" is a
 * number the reader then has to convert. The phrase underneath says "1 hr 15
 * mins" the moment it is typed, and the fields themselves are tidied to match
 * when they are left - not while they are being typed into, which would move
 * the digits out from under the cursor mid-keystroke.
 */
export function Duration({
  hours,
  minutes,
  onChange,
  maxHours,
  disabled,
}: Props) {
  const total = totalMinutes(hours, minutes);

  const type = (field: 'hours' | 'minutes', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, field === 'hours' ? 2 : 3);
    onChange({ hours, minutes, [field]: digits });
  };

  /** Carries the overflow into the hours, and holds the whole at one day. */
  const normalise = () => {
    if (total === 0) {
      onChange({ hours: hours === '' ? '' : '0', minutes: minutes === '' ? '' : '0' });
      return;
    }
    const capped = Math.min(total, maxHours * 60 + 59);
    onChange({
      hours: `${Math.floor(capped / 60)}`,
      minutes: `${capped % 60}`,
    });
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>HOURS</Text>
          <TextInput
            style={[styles.input, hours !== '' && styles.inputFilled]}
            value={hours}
            onChangeText={raw => type('hours', raw)}
            onBlur={normalise}
            placeholder="0"
            keyboardType="number-pad"
            selectTextOnFocus
            editable={!disabled}
            accessibilityLabel={`Hours, 0 to ${maxHours}`}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>MINUTES</Text>
          <TextInput
            style={[styles.input, minutes !== '' && styles.inputFilled]}
            value={minutes}
            onChangeText={raw => type('minutes', raw)}
            onBlur={normalise}
            placeholder="0"
            keyboardType="number-pad"
            selectTextOnFocus
            editable={!disabled}
            accessibilityLabel="Minutes"
          />
        </View>
      </View>

      <View style={styles.readout} accessibilityLiveRegion="polite">
        <Text
          style={[styles.readoutText, total === 0 && styles.readoutEmpty]}
          accessibilityLabel={
            total === 0
              ? 'How long it lasted, not set yet'
              : `That is ${formatDuration(total)}`
          }
        >
          {total === 0 ? 'Not set yet' : `That is ${formatDuration(total)}`}
        </Text>
      </View>
    </View>
  );
}
