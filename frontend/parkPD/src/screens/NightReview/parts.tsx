import { Pressable, Text, View } from 'react-native';
import { WAKE_COUNTS } from '../../types/dailyLog';
import { styles } from './NightReviewScreen.styles';

type Props = {
  value: number | null;
  onChange: (count: number) => void;
};

/**
 * How many times the night was broken, as four tiles rather than a stepper.
 *
 * The range is short and its top end is open, so there is nothing to step
 * through - and "4+ times" is a choice that no stepper could offer.
 */
export function WakeCountTiles({ value, onChange }: Props) {
  return (
    <View style={styles.tileRow}>
      {WAKE_COUNTS.map(option => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.tile, isSelected && styles.tileSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Wakes up ${option.label.toLowerCase()}`}
          >
            <Text
              style={[
                styles.tileText,
                isSelected && styles.tileTextSelected,
              ]}
            >
              {isSelected ? `✓ ${option.label}` : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
