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

export const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
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
    marginBottom: spacing.xxl,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
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
  noneBar: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  noneBarActive: {
    borderColor: feedback.success.line,
    backgroundColor: feedback.success.bg,
  },
  noneBarText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
  },
  noneBarTextActive: {
    color: feedback.success.fg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  eyebrow: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  followUpQuestion: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  // Stacked cards, so the two ways of logging read as a choice between two
  // descriptions rather than a pair of buttons.
  modeCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: feedback.info.bg,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeTitle: {
    flexShrink: 1,
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modeBadge: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  modeDescription: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
  },
  footnote: {
    fontSize: fontSize.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
