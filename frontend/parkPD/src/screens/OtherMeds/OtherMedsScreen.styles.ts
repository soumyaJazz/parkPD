import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
} from '../../theme';

/** The project floor for anything tappable. */
const TARGET = 48;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // The design's tinted ground, so the white card reads as a card. The same
    // pairing the scrolling dose layout uses.
    backgroundColor: colors.surface,
  },
  content: {
    paddingBottom: spacing.xl,
  },

  // --- The question card ----------------------------------------------------
  card: {
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
    boxShadow: '0px 6px 18px rgba(79, 95, 232, 0.08)',
  },
  /**
   * What this card is about, in the design's pale indigo. Sized to the 14px
   * floor rather than the design's 11px, and paired with the capsule icon so
   * it is not a colour on its own.
   */
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: feedback.info.bg,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: feedback.info.fg,
    letterSpacing: letterSpacing.label,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.small,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.lg,
  },

  // --- The field the "Other" chip reveals -----------------------------------
  otherField: {
    fontSize: fontSize.button,
    color: colors.text,
    minHeight: TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  otherFieldFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },

  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    lineHeight: lineHeight.body,
    marginTop: spacing.md,
  },

  /**
   * Says where Continue leads, so the button isn't the only clue - and sits
   * above it, so Continue is the last thing on the screen.
   */
  continueNote: {
    fontSize: fontSize.small,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
