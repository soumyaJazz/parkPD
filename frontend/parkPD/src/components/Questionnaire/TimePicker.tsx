import { Pressable, Text, View } from 'react-native';
import { MINUTE_STEP, formatTime12 } from '../../utils/date';
import type { TimeOfDay } from '../../utils/date';
import { timeStyles as styles } from './Questionnaire.styles';
import { StepButton } from './Scale';

type Meridiem = 'AM' | 'PM';

const MERIDIEMS: readonly Meridiem[] = ['AM', 'PM'];

/** The 12-hour clock face back to the 24-hour value that is actually stored. */
function to24Hour(hour12: number, meridiem: Meridiem): number {
  const base = hour12 % 12;
  return meridiem === 'AM' ? base : base + 12;
}

type FieldProps = {
  label: string;
  /** Already padded and formatted - this only draws it. */
  display: string;
  onStep: (direction: -1 | 1) => void;
  /** Named in the button's spoken label, e.g. "Later hour". */
  noun: string;
  disabled?: boolean;
};

function Field({ label, display, onStep, noun, disabled }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <StepButton
          glyph="−"
          label={`Earlier ${noun}`}
          onPress={() => onStep(-1)}
          disabled={disabled}
        />
        <Text style={styles.fieldValue}>{display}</Text>
        <StepButton
          glyph="+"
          label={`Later ${noun}`}
          onPress={() => onStep(1)}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

type Props = {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  disabled?: boolean;
};

/**
 * A clock set by pressing, not by spinning.
 *
 * Deliberately not a native picker, and deliberately not a wheel: this app also
 * builds for web, so one implementation keeps the two identical - and a wheel
 * asks for a flick landed precisely on a row of small type, which is the exact
 * gesture this app's readers are least able to make. Every part of the time is
 * a 56pt button instead, with the whole answer spelled out above them.
 */
function TimePicker({ value, onChange, disabled }: Props) {
  const meridiem: Meridiem = value.hour < 12 ? 'AM' : 'PM';
  // Midnight and noon are both "12" on the face.
  const hour12 = value.hour % 12 === 0 ? 12 : value.hour % 12;

  /**
   * Each control moves its own field and wraps within it: pressing + on 55
   * minutes goes to 00 without stealing an hour.
   *
   * That is not how a clock ticks, but it is how a field behaves, and the hour
   * has its own two buttons directly above - carrying would mean a press
   * labelled "later minute" silently changing the number beside it.
   */
  const stepHour = (direction: -1 | 1) => {
    const next = ((hour12 - 1 + direction + 12) % 12) + 1;
    onChange({ hour: to24Hour(next, meridiem), minute: value.minute });
  };

  const stepMinute = (direction: -1 | 1) => {
    const next = (value.minute + direction * MINUTE_STEP + 60) % 60;
    onChange({ hour: value.hour, minute: next });
  };

  return (
    <View>
      {/* One reading of the whole answer, so the two steppers and the AM/PM
          row never have to be assembled in the reader's head. */}
      <Text style={styles.display} accessibilityLabel={`Wake-up time, ${formatTime12(value)}`}>
        {formatTime12(value)}
      </Text>

      <Field
        label="Hour"
        display={`${hour12}`}
        onStep={stepHour}
        noun="hour"
        disabled={disabled}
      />
      <Field
        label="Minutes"
        display={`${value.minute}`.padStart(2, '0')}
        onStep={stepMinute}
        noun="minute"
        disabled={disabled}
      />

      <View style={styles.meridiemRow}>
        {MERIDIEMS.map(option => {
          const isSelected = option === meridiem;
          return (
            <Pressable
              key={option}
              style={[styles.meridiem, isSelected && styles.meridiemSelected]}
              onPress={() =>
                onChange({
                  hour: to24Hour(hour12, option),
                  minute: value.minute,
                })
              }
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={option === 'AM' ? 'Morning, A M' : 'Afternoon or evening, P M'}
              accessibilityState={{ selected: isSelected, disabled }}
            >
              {/* Ticked as well as filled - which half of the day is chosen
                  can't rest on the fill colour alone. */}
              <Text
                style={[
                  styles.meridiemText,
                  isSelected && styles.meridiemTextSelected,
                ]}
              >
                {isSelected ? `✓  ${option}` : option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default TimePicker;
