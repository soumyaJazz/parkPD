import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme';

/**
 * Copy here runs a size above the theme's 15px body. This is the one place the
 * user is asked to commit to something they can't take back, so the question
 * and its consequence get the larger type this project prefers for reading.
 */
const TITLE_SIZE = 20;
const MESSAGE_SIZE = 18;
const MESSAGE_LINE_HEIGHT = 28;

/**
 * The preferred 48 rather than the 44 floor, and stacked full width rather than
 * side by side - two half-width buttons put the safe answer and the destructive
 * one a thumb's width apart.
 */
const BUTTON_HEIGHT = 48;

export const styles = StyleSheet.create({
  // Holds the dim itself, so the dismiss layer beneath the card can be clear.
  root: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.18)',
  },
  title: {
    fontSize: TITLE_SIZE,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: MESSAGE_SIZE,
    lineHeight: MESSAGE_LINE_HEIGHT,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  // Well past the 8px minimum between two answers that mean opposite things.
  actions: {
    gap: spacing.md,
  },
  button: {
    minHeight: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  confirm: {
    backgroundColor: colors.primary,
  },
  confirmPressed: {
    backgroundColor: colors.primaryPressed,
  },
  /**
   * Filled rather than red-on-white: the darker red of the feedback palette
   * carries white text at 5.2:1, where the same red as a label on white sits
   * under the bar. The wording says what will happen, so the colour is never
   * what tells the user this one is destructive.
   */
  confirmDestructive: {
    backgroundColor: feedback.error.fg,
  },
  confirmDestructivePressed: {
    backgroundColor: '#A32E22',
  },
  confirmText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cancel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelPressed: {
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  busy: {
    opacity: 0.75,
  },
});
