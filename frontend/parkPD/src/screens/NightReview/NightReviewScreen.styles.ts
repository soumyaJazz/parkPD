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
    // The tinted ground the common-question cards sit on, shared with the two
    // questions before this one.
    backgroundColor: colors.surface,
  },
  content: {
    paddingBottom: spacing.xl,
  },

  // --- The card the four questions share ------------------------------------
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
    marginBottom: spacing.lg,
  },

  /**
   * One of the four questions inside the card.
   *
   * They share a card because they are one subject - last night - and because
   * three of them only exist depending on how the one above was answered.
   * Splitting them across screens would ask the user to remember an answer
   * that had scrolled away.
   */
  block: {
    marginBottom: spacing.xl,
  },
  blockLast: {
    marginBottom: 0,
  },
  /**
   * A rule between two of them. Solid rather than the design's dashed: React
   * Native draws dashed borders inconsistently across iOS, Android and web,
   * and the separation is what the line is for.
   */
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginBottom: spacing.xl,
  },
  qText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  qHelper: {
    fontSize: fontSize.small,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
  },

  // --- How many times ------------------------------------------------------
  tileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: TARGET + 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tileText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    textAlign: 'center',
  },
  tileTextSelected: {
    color: colors.white,
  },

  // --- The field the "Others" chip reveals ----------------------------------
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
    marginTop: spacing.md,
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
