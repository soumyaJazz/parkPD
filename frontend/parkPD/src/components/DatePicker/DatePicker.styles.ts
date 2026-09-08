import { StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme';

/**
 * Seven columns, so a cell is a seventh of the grid. Written out rather than
 * computed: a percentage has to stay a string literal for the style types to
 * accept it, and `${100 / 7}%` widens to plain string.
 */
const DAY_CELL = '14.2857%';

/**
 * Touch targets. The project floor is 44x44, so the day pill sits exactly on it
 * and the month/year chips - which carry four words in the widest case - go
 * past it to the preferred 48.
 */
const DAY_PILL = 44;
const CHIP_SIZE = 48;

/** Four to a row, so the year list can be paged and scrolled without measuring. */
export const YEARS_PER_ROW = 4;

/** Rows visible in the year window; one press of an arrow moves exactly this. */
export const YEAR_ROWS_PER_PAGE = 6;

export const YEARS_PER_PAGE = YEARS_PER_ROW * YEAR_ROWS_PER_PAGE;

/** Chip plus the cell's padding: the height of one row of the year list. */
export const YEAR_ROW_HEIGHT = CHIP_SIZE + spacing.xs * 2;

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
    padding: spacing.lg,
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLabel: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  arrow: {
    width: DAY_PILL,
    height: DAY_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A square showing two borders, rotated into a chevron.
  chevron: {
    width: 10,
    height: 10,
    borderColor: colors.text,
  },
  chevronLeft: {
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  chevronRight: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  chevronDisabled: {
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    width: DAY_CELL,
    textAlign: 'center',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.label,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    width: DAY_PILL,
    height: DAY_PILL,
    borderRadius: DAY_PILL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: fontSize.button,
    color: colors.text,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  dayTextDisabled: {
    color: colors.border,
  },
  // Months and years share a wider cell: four to a row, not seven.
  monthCell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  chip: {
    width: '100%',
    height: CHIP_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.button,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  /**
   * Caps the year list so a century of options can't push the card off-screen.
   * Six whole rows, so the cut never lands mid-row and leave the list looking
   * like it ends there.
   */
  yearScroll: {
    maxHeight: YEAR_ROW_HEIGHT * YEAR_ROWS_PER_PAGE,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DAY_PILL,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cancelText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
});
