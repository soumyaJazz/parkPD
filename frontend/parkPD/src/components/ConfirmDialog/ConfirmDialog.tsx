import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { styles } from './ConfirmDialog.styles';

type Props = {
  visible: boolean;
  /** The decision, as a question. */
  title: string;
  /** What will happen if they confirm, in plain words. */
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Colours the confirm button as the destructive answer of the two. */
  destructive?: boolean;
  /** The confirmed action is running: both answers stop taking presses. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A confirmation the app draws itself, rather than `Alert.alert`.
 *
 * Alert is a native module with no DOM equivalent - react-native-web ships it
 * as an empty function, so on web an Alert-gated action silently does nothing.
 * This renders the same on every platform, which is also what lets the copy
 * name the consequence and the buttons meet the project's target sizes.
 */
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  // Dismissing mid-action would leave the work running behind a screen the user
  // thinks they backed out of.
  const dismiss = () => {
    if (!busy) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.root}>
        {/* Tapping the dimmed area backs out, the way a native sheet does.
            Cancel below does the same job for anyone who doesn't know that. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.confirmDestructive : styles.confirm,
                pressed &&
                  (destructive
                    ? styles.confirmDestructivePressed
                    : styles.confirmPressed),
                busy && styles.busy,
              ]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ disabled: busy, busy }}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancel,
                pressed && styles.cancelPressed,
                busy && styles.busy,
              ]}
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              accessibilityState={{ disabled: busy }}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ConfirmDialog;
