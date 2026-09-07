import { Text, View } from 'react-native';
import { styles } from './ProfileScreen.styles';

/**
 * A detail the account is, rather than one it merely holds.
 *
 * Shown as a fact with the reason beside it, not as an input that refuses to
 * take focus: a field that looks editable and isn't leaves the reader trying
 * to work out what they did wrong.
 */
export function LockedDetail({
  value,
  badge,
  reason,
}: {
  value: string;
  badge: string;
  reason: string;
}) {
  return (
    <>
      <View style={styles.locked}>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.lockedBadge}>{badge}</Text>
      </View>
      <Text style={styles.lockedReason}>{reason}</Text>
    </>
  );
}
