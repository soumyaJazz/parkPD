import { StyleSheet } from 'react-native';
import {
  calendar,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '../../theme';

/** The project floor for anything tappable. */
const TARGET = 44;

/** The mark under a day, plus the air around it. */
export const MARK = 8;
const MARK_GAP = 2;

/**
 * Every dimension in the grid is a point, never a percentage.
 *
 * Yoga has to measure a wrapping row, and a cell sized by percentage whose
 * child takes its height from an `aspectRatio` is the case it measures short -
 * on iOS the card then clips at its rounded bounds and the last week of the
 * month, or the legend, is simply not drawn. The screen's width is known, so
 * the arithmetic is done here instead of being left to the layout engine.
 */
export function gridMetrics(windowWidth: number, insetX: number) {
  const cellWidth = Math.floor((windowWidth - insetX) / 7);
  // The circle is drawn inside the cell, so two neighbouring days keep some
  // daylight between them while the cell itself stays the tap target.
  const circle = Math.min(cellWidth - 6, TARGET + 2);
  return {
    cellWidth,
    circle,
    // Still past the 44pt floor at every width, and six rows of it are ~40pt
    // shorter than they were - which is most of what kept the legend off the
    // bottom of a phone.
    cellHeight: circle + MARK_GAP + MARK + 3,
  };
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 20,
    // Narrow for a card, because seven touch targets have to fit across it:
    // every point taken here comes off the width of a day.
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    boxShadow: '0px 8px 24px rgba(30, 40, 90, 0.07)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // Round, tinted, and the full 44 across - the design's 30px circle is under
  // half the area a thumb needs.
  arrow: {
    width: TARGET,
    height: TARGET,
    borderRadius: TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  arrowPressed: {
    backgroundColor: colors.primaryDisabled,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    textAlign: 'center',
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  /**
   * The tap target is the whole cell, not the circle drawn inside it - which
   * is what keeps a day at 44pt on a narrow phone while the fills stay apart.
   */
  // Width and height come from `gridMetrics`, so a row is a known number of
  // points tall and the card can't come out shorter than what it draws.
  cell: {
    alignItems: 'center',
    paddingTop: 2,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    // Carried by every day so the ones that draw a ring don't sit a hair
    // larger than the plain days beside them.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayToday: {
    borderColor: calendar.today.ring,
  },
  daySelected: {
    backgroundColor: calendar.selected.bg,
    borderColor: calendar.selected.bg,
  },
  dayText: {
    fontSize: 17,
    color: colors.text,
  },
  dayTextToday: {
    color: calendar.today.fg,
    fontWeight: fontWeight.bold,
  },
  dayTextSelected: {
    color: calendar.selected.fg,
    fontWeight: fontWeight.bold,
  },
  dayTextFuture: {
    color: calendar.future,
  },
  /**
   * The mark under a day. Always rendered, so a day carrying one and a day
   * without are the same height and the rows keep their rhythm.
   */
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    marginTop: MARK_GAP,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  // Filled against hollow: the two states differ in shape, not just in colour.
  markLogged: {
    backgroundColor: calendar.logged.dot,
    borderColor: calendar.logged.dot,
  },
  markInProgress: {
    borderColor: calendar.inProgress.ring,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // Fixed, so a legend that wraps to two lines is still a height the card
    // knows about before it draws.
    height: 22,
    gap: spacing.xs + 2,
  },
  legendMark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  legendToday: {
    borderColor: calendar.today.ring,
  },
  legendLogged: {
    backgroundColor: calendar.logged.dot,
    borderColor: calendar.logged.dot,
  },
  legendInProgress: {
    borderColor: calendar.inProgress.ring,
  },
  legendSelected: {
    backgroundColor: calendar.selected.bg,
    borderColor: calendar.selected.bg,
  },
  legendText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
});

/** The four marks the legend explains, in the order the grid decides them. */
export const legendMarks = [
  { label: 'Today', style: styles.legendToday },
  { label: 'Logged', style: styles.legendLogged },
  { label: 'In progress', style: styles.legendInProgress },
  { label: 'Selected', style: styles.legendSelected },
] as const;
