import { StyleSheet } from 'react-native';
import {
  brandGradient,
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radius,
  screenPadding,
  spacing,
} from '../../theme';

/** The project floor for anything tappable. */
const TARGET = 48;

/** How far the scrolling layout insets a card from the screen's own gutter. */
export const TIMELINE_INSET = 30;

/**
 * How wide a tablet tile can be.
 *
 * Points, not percentages: a row of squares sized by percentage and taking its
 * height from an `aspectRatio` is the case Yoga measures short - the same trap
 * `MonthCalendar` documents. Which is why both arguments have to be the truth:
 * the two layouts hold this row at different widths, and `appWidth` is what the
 * app is drawn across rather than the browser window it sits in - see
 * `useAppWidth`. Sized from the window, one tile filled a whole card.
 */
export function tileMetrics(appWidth: number, insetX: number) {
  const available = appWidth - insetX;
  const across = (count: number) =>
    Math.max(TARGET, Math.floor((available - spacing.sm * (count - 1)) / count));
  // Five across the whole row against four in the fractions: both carry a
  // leading "None", and the whole numbers run 1 to 4.
  return { whole: across(5), fraction: across(4) };
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // --- Header ---------------------------------------------------------------
  header: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  // Which dose this is, in the app's own gradient. Flat colour behind it is the
  // deep end, so white text is safe if a platform can't draw the gradient.
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: '#4A5AE8',
    backgroundImage: brandGradient,
  },
  badgeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: letterSpacing.label,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },

  // --- Body -----------------------------------------------------------------
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  question: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.lg,
  },
  // The grey aside that explains a term before it can be answered.
  explainer: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  explainerText: {
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: lineHeight.body,
  },
  // Separates two questions sharing a screen, so the second reads as its own.
  nextQuestion: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.md,
  },

  // --- The tablets question -------------------------------------------------
  eyebrow: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.md,
  },
  eyebrowSpaced: {
    marginTop: spacing.lg,
  },
  tileRow: {
    flexDirection: 'row',
    // The 48pt floor wins over fitting four across on the narrowest phones, so
    // the row wraps rather than running past its card.
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tileText: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // "None" is a word in a box built for a digit, so it takes a smaller size.
  tileTextWord: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  tileTextSelected: {
    color: colors.white,
  },
  plus: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  /**
   * What the two rows add up to, always on screen - including before anything
   * is chosen, where it reads "No dose selected". A card that appeared only
   * once the answer was complete would be silent at the moment the reader is
   * looking for it.
   */
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: feedback.info.bg,
  },
  totalLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // --- The follow-ups a "yes" to dyskinesia reveals --------------------------
  unfold: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  subLabel: {
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subBlock: {
    marginBottom: spacing.xl,
  },

  // --- The card between doses -----------------------------------------------
  done: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  doneMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: feedback.info.bg,
    marginBottom: spacing.lg,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  doneText: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    textAlign: 'center',
  },

  // --- Footer ---------------------------------------------------------------
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  // Labelled, not a bare chevron: back is a word this audience shouldn't have
  // to recognise a symbol for, and there is room for it beside Continue.
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  backPressed: {
    backgroundColor: colors.surface,
  },
  backText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  continue: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  continuePressed: {
    backgroundColor: colors.primaryPressed,
  },
  continueText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});

/**
 * The scrolling layout: every question of a dose as a card on one timeline.
 *
 * A card per question rather than one long column, because a page of ten
 * questions with nothing between them is a wall - the cards and the numbered
 * dots beside them are what let a reader find their place again after looking
 * away.
 */
export const scrollStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // Stays put while the questions move under it, so which dose this is and how
  // much is left are never scrolled off.
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  answeredPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  answeredText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  answeredCount: {
    color: colors.primary,
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  /** The rail the dots sit on, and the room it takes out of the cards. */
  timeline: {
    paddingLeft: TIMELINE_INSET,
  },
  rail: {
    position: 'absolute',
    left: 11,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 2,
    backgroundColor: colors.border,
  },
  card: {
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    boxShadow: '0px 6px 18px rgba(79, 95, 232, 0.06)',
  },
  /**
   * The question's number, on the rail beside its card. Filled once the
   * question would not stop you leaving - which is a state, so it also carries
   * a tick rather than only a colour.
   */
  dot: {
    position: 'absolute',
    left: -30,
    top: spacing.lg,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  dotAnswered: {
    backgroundColor: colors.primary,
  },
  dotText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  question: {
    fontSize: fontSize.button + 2,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
  },
  explainer: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  explainerText: {
    fontSize: fontSize.small,
    color: colors.text,
    lineHeight: lineHeight.body,
  },
  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.sm,
  },
  /**
   * Stands in for the six questions a "no motor improvement" answer removes.
   * The cards go, but something has to say why, or they look mislaid.
   */
  skipNotice: {
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: feedback.error.line,
    backgroundColor: feedback.error.bg,
    marginBottom: spacing.md,
  },
  skipNoticeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: feedback.error.fg,
    lineHeight: lineHeight.body,
  },
  // Where one dose ends and the next begins, said in words across a rule.
  transition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  transitionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.primaryDisabled,
  },
  transitionLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: letterSpacing.label,
  },
  teaser: {
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryDisabled,
    backgroundColor: colors.background,
  },
  teaserText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: lineHeight.body,
  },
  // Outside the scroll: the one action this screen is for shouldn't be
  // somewhere you have to reach the bottom of ten questions to find.
  saveBar: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  save: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  savePressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
