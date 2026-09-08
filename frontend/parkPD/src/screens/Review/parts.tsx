import { Modal, Pressable, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import { colors, feedback } from '../../theme';
import type { Section } from './summary';
import { styles } from './ReviewScreen.styles';

/** One part of the day, and what was answered about it. */
export function ReviewCard({ section }: { section: Section }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name={section.icon} size={13} color={colors.subtext} />
        <Text style={styles.cardHeaderText}>{section.title}</Text>
      </View>

      {section.rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index === 0 && styles.rowFirst]}
        >
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

type DoneProps = {
  visible: boolean;
  /** The day that was saved, spelled out - "Tuesday, 1 September". */
  day: string;
  onDismiss: () => void;
};

/**
 * The dialog that closes the day.
 *
 * Drawn rather than `Alert.alert` for the reason `ConfirmDialog` gives: Alert
 * is a no-op on web. One button, because there is only one thing left to do,
 * and it does not close itself on a timer - the confirmation is the point, and
 * an older reader should not have to catch it before it goes.
 */
export function LoggedDialog({ visible, day, onDismiss }: DoneProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalRoot}>
        <View
          style={styles.modalCard}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={styles.modalIcon}>
            <Icon name="check" size={28} color={feedback.success.fg} />
          </View>

          <Text style={styles.modalTitle}>Day logged</Text>
          <Text style={styles.modalMessage}>
            {`Your entry for ${day} has been saved. You can look at it again any time from your log.`}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.modalButton,
              pressed && styles.modalButtonPressed,
            ]}
            onPress={onDismiss}
            accessibilityRole="button"
          >
            <Text style={styles.modalButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
