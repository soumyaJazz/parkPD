import { Pressable, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import type { Medicine } from '../../types/dailyLog';
import {
  MEDICINES,
  TIMES_TAKEN,
  describeTimesTaken,
} from '../../types/dailyLog';
import { MIN_TALLY_SLOTS, styles } from './MorningCheckScreen.styles';

/**
 * The two medicines as one segmented choice.
 *
 * One tray rather than two cards, because it is one answer - two separate cards
 * can both look unpicked, and this question has no "neither".
 */
export function MedicineTabs({
  value,
  onChange,
}: {
  value: Medicine | null;
  onChange: (medicine: Medicine) => void;
}) {
  return (
    <View style={styles.tabs}>
      {MEDICINES.map(option => {
        const isSelected = value === option;
        return (
          <Pressable
            key={option}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            {/* The icon slot carries the state: a tick once chosen, the capsule
                until then. A raised white tab on a grey tray is a fine signal
                for anyone who can see the difference, and this app does not
                assume that. */}
            <Icon
              name={isSelected ? 'check' : 'capsule'}
              size={16}
              color={isSelected ? colors.primary : colors.subtext}
            />
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** How many times in the day, as a number to nudge and a row of marks. */
export function TimesStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const nudge = (delta: number) =>
    onChange(
      Math.min(TIMES_TAKEN.max, Math.max(TIMES_TAKEN.min, value + delta)),
    );

  const canDecrease = value > TIMES_TAKEN.min;
  const canIncrease = value < TIMES_TAKEN.max;
  const slots = Math.max(value, MIN_TALLY_SLOTS);

  return (
    <View>
      <View style={styles.stepper}>
        <Pressable
          style={({ pressed }) => [
            styles.stepButton,
            pressed && canDecrease && styles.stepButtonPressed,
          ]}
          onPress={() => nudge(-1)}
          disabled={!canDecrease}
          accessibilityRole="button"
          accessibilityLabel="One time fewer"
          accessibilityState={{ disabled: !canDecrease }}
        >
          <Text
            style={[styles.stepGlyph, !canDecrease && styles.stepGlyphDisabled]}
          >
            −
          </Text>
        </Pressable>

        <View
          style={styles.readout}
          accessibilityRole="adjustable"
          accessibilityLabel="How many times you took your medicine today"
          accessibilityValue={{
            min: TIMES_TAKEN.min,
            max: TIMES_TAKEN.max,
            now: value,
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event =>
            nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
        >
          <Text style={styles.count}>{value}</Text>
          <Text style={styles.unit}>{describeTimesTaken(value)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.stepButton,
            pressed && canIncrease && styles.stepButtonPressed,
          ]}
          onPress={() => nudge(1)}
          disabled={!canIncrease}
          accessibilityRole="button"
          accessibilityLabel="One time more"
          accessibilityState={{ disabled: !canIncrease }}
        >
          <Text
            style={[styles.stepGlyph, !canIncrease && styles.stepGlyphDisabled]}
          >
            +
          </Text>
        </Pressable>
      </View>

      {/* The count again, as marks. Hidden from screen readers, which have the
          number itself and would otherwise be read a row of empty circles. */}
      <View
        style={styles.tallyRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: slots }, (_, index) => {
          const isFilled = index < value;
          return (
            <View
              key={index}
              style={[styles.tally, isFilled && styles.tallyFilled]}
            >
              {isFilled ? (
                <Icon name="check" size={15} color={colors.white} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
