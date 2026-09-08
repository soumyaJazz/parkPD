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

  /**
   * Holds whichever way in is showing, and is what the PM notice is measured
   * against - anchored to the bottom of this, so it covers the dial rather
   * than the reading above it or the buttons below.
   */
  body: {
    position: 'relative',
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

/**
 * The warning over the dial when a morning time is set to PM.
 *
 * Its own card rather than the app's toast: a toast is drawn at the root of
 * the app, which on both platforms is behind this modal's native window, so
 * one raised from in here would never be seen.
 */
export const noticeStyles = StyleSheet.create({
  notice: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: feedback.warning.line,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 4,
    boxShadow: '0px 6px 20px rgba(16, 24, 40, 0.16)',
  },
  /**
   * The amber edge. It repeats what the words already say rather than being
   * the only thing that says it, so nothing is lost if the colour isn't seen.
   */
  accent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 4,
    backgroundColor: feedback.warning.fg,
  },
  title: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.button,
    lineHeight: 23,
    color: colors.text,
    marginBottom: spacing.md,
  },
  // Stacked and full width: two half-width answers that mean opposite things
  // would sit a thumb's width apart.
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  /** The likelier of the two answers, so it is the filled one. */
  fix: {
    backgroundColor: colors.primary,
  },
  fixPressed: {
    backgroundColor: colors.primaryPressed,
  },
  fixText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  keep: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  keepPressed: {
    backgroundColor: colors.surface,
  },
  keepText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});

/** The trigger on the question itself: the answer, large and centred, in blue. */
export const fieldStyles = StyleSheet.create({
  /**
   * One row rather than a stacked panel. The reading and the invitation sit
   * side by side, which is a third of the height and still well past the touch
   * floor - these questions have a lot else to fit on the screen with them.
   */
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: feedback.info.line,
    backgroundColor: feedback.info.bg,
  },
  fieldPressed: {
    borderColor: colors.primary,
  },
  // Dashed and plain until answered, so an unset time doesn't read as a
  // reading the question already has.
  fieldEmpty: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  time: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  timeEmpty: {
    fontSize: fontSize.button + 2,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  // Says the reading is a button, which a number on a tinted panel does not.
  action: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
});
