import { StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.md,
    marginBottom: spacing.sm,
  },
  // A square showing only two borders, rotated into a "<".
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    transform: [{ rotate: '45deg' }],
  },
  /**
   * How far through the log this is, said in words above the bar that draws it.
   * A bar on its own is a length, and a length answers "how much is left" only
   * for someone who can see the whole of it at once.
   */
  stepLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dateLine: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.subtext,
    marginBottom: spacing.xxl,
  },
  // The field the "Others" chip reveals.
  textField: {
    fontSize: fontSize.button,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },
  textFieldFilled: {
    borderBottomColor: colors.primary,
  },
  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.sm,
  },
  continue: {
    marginTop: spacing.sm,
  },
  // Says where Continue leads, so the button isn't the only clue.
  continueNote: {
    fontSize: fontSize.small,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
