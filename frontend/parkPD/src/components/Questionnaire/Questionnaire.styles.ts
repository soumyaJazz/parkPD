import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
} from '../../theme';

/** The project floor for anything tappable. */
const TARGET = 48;

export const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
  },
  question: {
    fontSize: 19,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.small,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.md,
  },
  // Grey aside for the longer explanations - kept visually apart from the
  // question so it reads as background, not as part of what is being asked.
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteTitle: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: lineHeight.body,
  },
  noteTextAfter: {
    marginTop: spacing.md,
  },
  noteBullet: {
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  // Follow-ups are indented behind a rule so they read as belonging to the
  // answer that revealed them.
  followUp: {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: spacing.lg,
    marginTop: spacing.lg,
  },
  followUpLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
  // Yes and No share the row evenly so neither reads as the default.
  yesNoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  yesNo: {
    flex: 1,
    minHeight: TARGET + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  yesNoText: {
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  // Full-width escape hatch under a symptom list.
  noneBar: {
    minHeight: TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: spacing.md,
  },
  noneBarText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
  },
  numberRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  numberField: {
    flex: 1,
    // see globalStyles.input: a flex item on web won't shrink past its
    // intrinsic width without this
    minWidth: 0,
  },
  numberLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  numberInputFilled: {
    borderBottomColor: colors.primary,
  },
  numberInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  numberSuffix: {
    fontSize: fontSize.button,
    color: colors.subtext,
  },
  // Tinted so the follow-up field reads as part of the answer above it.
  numberTinted: {
    backgroundColor: feedback.info.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0,
  },
  /**
   * Full-width answers, stacked. Used where the two options are sentences
   * rather than words - side by side they would wrap to three lines each and
   * the shorter one would read as the lighter answer.
   */
  answerStack: {
    gap: spacing.md,
  },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TARGET + 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  answerMark: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
  },
  answerText: {
    flex: 1,
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 24,
  },
  // Hollow against filled: which answer is chosen differs in shape, so it
  // survives being read without colour.
  answerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.sm,
  },
});

/** Yes and No carry opposite meanings question to question, so the palette is picked per use. */
export const tone = {
  bad: {
    border: feedback.error.line,
    background: feedback.error.bg,
    text: feedback.error.fg,
  },
  good: {
    border: feedback.success.line,
    background: feedback.success.bg,
    text: feedback.success.fg,
  },
} as const;

/**
 * The - and + buttons shared by the scale and the time picker.
 *
 * Deliberately larger than the 48pt floor: these are the controls a user with
 * a tremor presses repeatedly, and every one of them has a visible label read
 * out beside the glyph.
 */
const STEP_TARGET = 56;

export const stepperStyles = StyleSheet.create({
  button: {
    width: STEP_TARGET,
    height: STEP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDisabled,
    borderColor: colors.primary,
  },
  glyph: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    // The glyphs sit high in their line box at this weight; nudged so the
    // minus and the plus share one optical centre.
    lineHeight: 32,
  },
});

/** The 0-100 scale: a track to drag, two steppers, and a number to type into. */
export const scaleStyles = StyleSheet.create({
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  // Tinted, so the number reads as the answer rather than as a caption over
  // the track.
  readout: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: STEP_TARGET,
    borderRadius: radius.md,
    backgroundColor: feedback.info.bg,
  },
  /**
   * Right-aligned in a fixed width: the digits then keep their place as the
   * value crosses 10 and 100, instead of the whole readout shuffling sideways
   * on every press.
   */
  input: {
    width: 74,
    fontSize: 34,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'right',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  percent: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  /**
   * The row the finger lands in, which is taller than the track it draws: a
   * 10pt bar is a hard thing to hit, so the whole 48pt band takes the touch.
   */
  trackArea: {
    height: 48,
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    boxShadow: '0px 2px 6px rgba(30, 40, 90, 0.25)',
  },
  endRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  endLabel: {
    flex: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    // Not colors.label: that grey lands near 3:1 on white, under the bar this
    // project holds itself to for text this size.
    color: colors.subtext,
  },
  endLabelRight: {
    textAlign: 'right',
  },
});
