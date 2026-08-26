import { StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    marginBottom: spacing.xl,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs + 2,
    marginBottom: spacing.xxl,
  },
  contact: {
    flexShrink: 1,
    fontSize: fontSize.button,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  editLink: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  otpBox: {
    flex: 1,
    textAlign: 'center',
    /**
     * On web a flex item defaults to `min-width: auto`, so the underlying
     * <input> refuses to shrink past its intrinsic width and the four boxes
     * overflow the row. Yoga already defaults this to 0, so native is
     * unaffected.
     */
    minWidth: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  timer: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  resend: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  resendDisabled: {
    opacity: 0.4,
  },
});
