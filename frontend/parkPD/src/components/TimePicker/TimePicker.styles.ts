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

/** The project floor for anything tappable; the dial's numbers sit exactly on it. */
const TARGET = 44;

/** The puck behind a number on the dial. */
export const NUMBER = TARGET;

/**
 * How big the clock face can be here.
 *
 * Every position on it is a point computed from trigonometry, not a percentage:
 * a number has to land on the ring at a size the layout engine never has to
 * measure, or the puck and the hand it sits on disagree by a pixel or two at
 * every angle.
 */
export function dialMetrics(windowWidth: number) {
  const card = Math.min(360, windowWidth - spacing.xl * 2);
  const inner = card - spacing.lg * 2;
  const size = Math.min(264, inner);
  return {
    size,
    center: size / 2,
    /** Where the centre of a number sits, inset so its puck clears the edge. */
    ring: size / 2 - NUMBER / 2 - 4,
  };
}

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
    borderRadius: 24,
    padding: spacing.lg,
    boxShadow: '0px 12px 32px rgba(30, 40, 90, 0.20)',
  },
  title: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.lg,
  },

  // --- The reading, and the two halves of it you can switch between ---------
  timeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  /**
   * Both halves are buttons, and they are the way back to the hour after the
   * dial has moved on to the minutes - so they are full-height touch targets
   * rather than a pair of labels.
   */
  field: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  fieldActive: {
    borderColor: colors.primary,
    backgroundColor: feedback.info.bg,
  },
  fieldText: {
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  fieldTextActive: {
    color: colors.primary,
  },
  colon: {
    alignSelf: 'center',
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: colors.border,
  },
  meridiemColumn: {
    width: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  meridiem: {
    flex: 1,
    minHeight: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  meridiemSelected: {
    backgroundColor: colors.primary,
  },
  meridiemText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  meridiemTextSelected: {
    color: colors.white,
  },

  // --- The dial -------------------------------------------------------------
  // Says which half the dial is setting, since the dial moves on by itself once
  // an hour is chosen and a changed ring of numbers is a quiet way to say so.
  dialCaption: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dialWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dial: {
    backgroundColor: colors.surface,
  },
  number: {
    position: 'absolute',
    width: NUMBER,
    height: NUMBER,
    borderRadius: NUMBER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberSelected: {
    backgroundColor: colors.primary,
  },
  numberText: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  numberTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },

  // --- Typed entry, the way in that asks for no aim at all ------------------
  entry: {
    marginBottom: spacing.lg,
  },
  entryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  entryField: {
    flex: 1,
    minWidth: 0,
  },
  entryLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.sm,
  },
  entryInput: {
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  entryHint: {
    fontSize: fontSize.small,
    color: colors.subtext,
    marginTop: spacing.sm,
  },

  // --- Footer ---------------------------------------------------------------
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  /**
   * Labelled rather than a bare keyboard glyph. A keyboard icon is not one of
   * the handful this app treats as universally understood, and this is the
   * control that keeps the dial from being the only way to set a time.
   */
  modeButton: {
    minHeight: TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  modeButtonPressed: {
    backgroundColor: colors.primaryDisabled,
  },
  modeButtonText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  action: {
    minHeight: TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  actionPressed: {
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
  },
  confirmText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});

/** The trigger on the question itself: the answer, large and centred, in blue. */
export const fieldStyles = StyleSheet.create({
  field: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: feedback.info.line,
    backgroundColor: feedback.info.bg,
  },
  fieldPressed: {
    borderColor: colors.primary,
  },
  time: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // Says the reading is a button, which a number on a tinted panel does not.
  action: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
});
