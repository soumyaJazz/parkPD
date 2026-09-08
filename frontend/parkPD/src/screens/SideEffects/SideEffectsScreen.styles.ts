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
    // The tinted ground the common-question cards sit on, shared with the
    // question before this one.
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
    marginBottom: spacing.md,
  },
  /**
   * Sentence case rather than the design's caps: at four words this is a line
   * of instruction, not a label, and caps slow it down for the readers this is
   * built for.
   */
  sectionHint: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
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

  /**
   * The running count under the chips.
   *
   * A dozen chips is more than can be checked at a glance, so the card says
   * back in words what it understood - and it is the only place the empty
   * answer is stated as an answer rather than shown as nothing selected.
   */
  summary: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  summaryText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    lineHeight: lineHeight.body,
  },
  summaryCount: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
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
