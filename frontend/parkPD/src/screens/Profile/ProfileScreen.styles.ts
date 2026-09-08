import { Platform, StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.md,
    marginBottom: spacing.md,
  },
  // A square showing only two borders, rotated into a "<".
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    transform: [{ rotate: '45deg' }],
  },
  subtext: {
    marginBottom: 26,
  },
  /**
   * The line that says which half of the form the reader is in. This screen
   * asks for two quite different things - who you are, then twenty clinical
   * questions - and without a break between them the second set arrives with
   * no warning.
   */
  section: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionFirst: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  /**
   * A step down from the shared 22px input: this form stacks six fields, and
   * names and addresses run long enough to clip at that size.
   */
  field: {
    fontSize: 18,
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
  // Says why the field above cannot be typed in, rather than leaving the
  // reader to work it out from the fact that it doesn't respond.
  lockedReason: {
    fontSize: fontSize.caption,
    color: colors.subtext,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
   * the value Text inside instead.
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
  // Sits under the scroll rather than inside it: this form is twenty questions
  // long, and the one control that saves it must not be at the bottom of them.
  footer: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
