import { StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
} from '../../theme';

/** The project floor for anything tappable. */
const TARGET = 48;

/** One mark in the tally under the stepper. */
const TALLY = 32;

/**
 * The tally always draws at least this many slots, so a count of one isn't a
 * single dot adrift in the middle of the screen.
 */
export const MIN_TALLY_SLOTS = 4;

export const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
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

  // --- Which medicine -------------------------------------------------------
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    minHeight: TARGET,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
    // Carried by both, so the chosen tab doesn't sit a hair larger.
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabSelected: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    boxShadow: '0px 3px 10px rgba(79, 95, 232, 0.16)',
  },
  tabText: {
    flexShrink: 1,
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  tabTextSelected: {
    color: colors.primary,
  },

  // --- How many times -------------------------------------------------------
  // The half of the sentence that separates this question from the one it is
  // most likely to be mistaken for.
  clarify: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.lg,
  },
  clarifyStrong: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  stepButton: {
    width: TARGET + 4,
    height: TARGET + 4,
    borderRadius: (TARGET + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepButtonPressed: {
    backgroundColor: colors.primaryDisabled,
  },
  stepGlyph: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  stepGlyphDisabled: {
    color: colors.border,
  },
  // Fixed, so the row doesn't shuffle sideways as the number changes width.
  readout: {
    minWidth: 104,
    alignItems: 'center',
  },
  count: {
    fontSize: 46,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 50,
  },
  unit: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  /**
   * The count again, as a row of marks. It says nothing the number above does
   * not, which is the point: a quantity is easier to check against than to
   * read, and nothing here depends on seeing it.
   */
  tallyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tally: {
    width: TALLY,
    height: TALLY,
    borderRadius: TALLY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tallyFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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

