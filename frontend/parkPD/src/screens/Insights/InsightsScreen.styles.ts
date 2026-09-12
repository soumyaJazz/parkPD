import { StyleSheet } from 'react-native';
import {
  activity,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme';

/** The project floor for anything tappable; 48 where there is room for it. */
const TARGET = 48;

/**
 * Body copy on this screen.
 *
 * 16, not the shared `fontSize.body` of 15. This screen is read rather than
 * filled in - three or four sentences and a list of periods - and 16 is the
 * floor the project sets for anything that is prose. `fontSize.caption` (13) is
 * used nowhere here: it is below the 14 this project allows anywhere at all.
 */
const BODY = 16;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // --- Header -------------------------------------------------------------
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  /**
   * Labelled, not a bare chevron. The one icon-only control this project allows
   * is a close X, and this is not one.
   */
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TARGET,
    marginLeft: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  backButtonPressed: {
    backgroundColor: colors.divider,
  },
  backText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },

  // --- Cards --------------------------------------------------------------
  card: {
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  body: {
    fontSize: BODY,
    lineHeight: 25,
    color: colors.text,
  },
  bodyMuted: {
    fontSize: BODY,
    lineHeight: 25,
    color: colors.subtext,
  },

  // --- Who and when -------------------------------------------------------
  patientName: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  patientMeta: {
    fontSize: BODY,
    lineHeight: 25,
    color: colors.subtext,
  },
  /**
   * A label, then the answer under it. Persistent, so what the list is never
   * has to be inferred from where it sits - and worded as the day's own answer
   * rather than as a standing fact about the person, because that is what it is.
   */
  detailLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    marginTop: spacing.sm,
  },
  detailValue: {
    fontSize: BODY,
    lineHeight: 25,
    color: colors.text,
  },

  // --- Day picker ---------------------------------------------------------
  dayValue: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  /**
   * The way to another day. A button with a word on it rather than a tap on the
   * date itself: a date that silently opens a calendar is a control nobody can
   * see, and this screen is read more often than it is navigated.
   */
  changeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: TARGET,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  changeDayPressed: {
    backgroundColor: colors.divider,
  },
  changeDayText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  pickerHint: {
    fontSize: fontSize.small,
    lineHeight: 21,
    color: colors.subtext,
    marginTop: spacing.sm,
  },

  // --- Chart --------------------------------------------------------------
  chartCaption: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  // Centres the axis caption under the plot without a second measurement.
  axisCaption: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textAlign: 'center',
  },

  /**
   * The pattern key.
   *
   * A legend, with one difference that matters: each row carries the line's own
   * dash pattern beside the word, so it is matched by shape as well as by
   * colour. The stretches long enough to hold a label get one drawn on the line
   * itself, and every stretch appears in the written list below - this covers
   * the short ones in between.
   */
  keyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  keyLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // --- Totals -------------------------------------------------------------
  totalsGrid: {
    gap: spacing.sm,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  totalText: {
    flex: 1,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: BODY,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalClinical: {
    fontSize: fontSize.small,
    color: colors.subtext,
  },
  /**
   * The figure. Bold and in the darker of each state's two shades - the line
   * colours clear 3:1, which is the bar for a stroke and not for a number.
   */
  totalValue: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
  },
  totalsNote: {
    fontSize: fontSize.small,
    lineHeight: 21,
    color: colors.subtext,
    marginTop: spacing.xs,
  },

  // --- Periods ------------------------------------------------------------
  period: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  periodFirst: {
    borderTopWidth: 0,
  },
  /** A coloured rule down the left of the row - the state, said again. */
  periodRule: {
    width: 4,
    borderRadius: 2,
  },
  periodText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  periodTime: {
    fontSize: BODY,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  periodState: {
    fontSize: BODY,
    fontWeight: fontWeight.semibold,
  },
  periodDetail: {
    fontSize: fontSize.small,
    lineHeight: 21,
    color: colors.subtext,
  },
  /**
   * Dyskinesia, said in full under the period it happened in.
   *
   * The hand on the chart is a picture, and this is the sentence behind it -
   * near-black on white rather than the muted grey of the line above, because
   * it is the one thing on this row a clinician is scanning for.
   */
  movements: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  movementsText: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.small,
    lineHeight: 21,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // --- Notices ------------------------------------------------------------
  notice: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  noticeError: {
    fontSize: BODY,
    lineHeight: 25,
    fontWeight: fontWeight.semibold,
    color: activity.off.text,
  },
  action: {
    minHeight: TARGET,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  actionPressed: {
    backgroundColor: colors.primaryPressed,
  },
  actionText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
