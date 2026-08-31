import { StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radius,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    // subtext rather than the lighter `label` token: this sits on the grey
    // card, where the paler grey drops under the contrast bar for this audience
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  rowValue: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.text,
  },
  signOutButton: {
    // 48 rather than the 44 minimum - this is the only control on the screen
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  signOutText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
});
