import { Platform, StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  // flexGrow, so a short form still fills the frame; a taller one scrolls.
  content: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  // Sits under the scroll rather than inside it, so "Next" is on screen from
  // the moment the form opens.
  footer: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  subtext: {
    marginBottom: 26,
  },
  /**
   * A step down from the shared 22px input: this form stacks six fields, and
   * names and addresses run long enough to clip at that size.
   */
  field: {
    fontSize: 18,
  },
  // Keeps the "Optional" tag on the label's baseline instead of below it.
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optional: {
    fontSize: fontSize.caption,
    color: colors.muted,
    marginBottom: 14,
  },
  // Not a disabled TextInput: this reads as a fact about the account, so it
  // shouldn't look like a field that merely refused focus.
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  lockedValue: {
    flexShrink: 1,
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  lockedBadge: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm + 2,
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
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  chipTextSelected: {
    color: colors.white,
  },
  // The two age inputs are alternatives, so the rule reads between them.
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
  },
  /**
   * Borrows the underline field's box rather than composing globalStyles.input
   * onto it: a Pressable takes view styles only, so the type properties sit on
   * the value Text inside instead. Padding matches the input's, so the two
   * kinds of field line up down the form.
   */
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    ...Platform.select({
      web: { paddingVertical: 15 },
      default: { paddingVertical: spacing.sm },
    }),
  },
  dateFieldFilled: {
    borderBottomColor: colors.primary,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  datePlaceholder: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.border,
  },
  dateAction: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
