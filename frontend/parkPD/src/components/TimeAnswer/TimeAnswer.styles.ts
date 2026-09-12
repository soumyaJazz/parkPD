import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radius,
  spacing,
} from '../../theme';

/**
 * A deeper red than `feedback.error.fg` for the one message here that refuses
 * an answer outright.
 *
 * The project holds critical text to AAA - 7:1 - and the shared red lands at
 * 4.7:1 on the tinted card this sits on. This one clears 7:1 there.
 */
const REFUSED_TEXT = '#98271C';

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
  /**
   * The earliest this answer may be, said under the field.
   *
   * Only drawn where the suggestions do not already say it - see
   * `floorWorthSaying`. Near-black rather than the muted grey the hints use,
   * because this one is a rule the next tap has to obey rather than an aside.
   */
  floorHint: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.body,
    color: colors.text,
    marginTop: spacing.md,
  },
  /**
   * That the answer given lands after midnight.
   *
   * A clock reading cannot say which day it is on, and "2:00 AM" under an
   * 11:00 PM dose looks like a mistake until something says it isn't. Toned
   * as information rather than as a warning: a late night is not a problem.
   */
  nextDay: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.body,
    color: feedback.info.fg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: feedback.info.bg,
    borderWidth: 1,
    borderColor: feedback.info.line,
  },
  /**
   * The card that turns an answer down.
   *
   * A heading that names the problem over a sentence that says what to do, so
   * the two are not one block to be read through - and never colour alone: the
   * words carry it, and the tint only backs them up.
   */
  refused: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: feedback.error.line,
    backgroundColor: feedback.error.bg,
  },
  refusedTitle: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: REFUSED_TEXT,
    marginBottom: spacing.xs,
  },
  refusedText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.body,
    color: REFUSED_TEXT,
  },
});

/** Which way the escape reads - the label says it, this only tints it. */
export const escapeTone = {
  bad: { border: feedback.error.line, background: feedback.error.bg, text: feedback.error.fg },
  good: { border: feedback.success.line, background: feedback.success.bg, text: feedback.success.fg },
} as const;
