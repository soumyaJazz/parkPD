import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  // "OR USE SUGGESTIONS", with a rule running out either side of it.
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
  },
  /**
   * One suggestion to a row, full width.
   *
   * Two to a row meant sizing each in points off the window, which was a lie
   * wherever the question sat inside something narrower than the screen - the
   * scrolling layout insets its cards by another sixty-odd points, and the
   * tiles ran straight out of them. Full width is measured by the parent
   * instead, so there is nothing left to get wrong.
   */
  grid: {
    gap: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  suggestionSelected: {
    borderColor: colors.primary,
    backgroundColor: feedback.info.bg,
  },
  // The sentence takes the row, and wraps inside it when it has to.
  offset: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 20,
  },
  offsetSelected: {
    color: colors.primary,
  },
  // The clock time it works out to, at the end of the row.
  landsAt: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  landsAtSelected: {
    color: colors.primary,
  },
  /**
   * The answer that the thing being asked about never happened.
   *
   * Full width and set apart under its own "OR": it is not one more time to
   * pick, and a tile among the offsets would read as one.
   */
  escape: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.background,
  },
  escapeText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSize.small,
    color: colors.subtext,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
});

/** Which way the escape reads - the label says it, this only tints it. */
export const escapeTone = {
  bad: { border: feedback.error.line, background: feedback.error.bg, text: feedback.error.fg },
  good: { border: feedback.success.line, background: feedback.success.bg, text: feedback.success.fg },
} as const;
