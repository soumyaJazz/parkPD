import { StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';

export const styles = StyleSheet.create({
  subtext: {
    marginBottom: 26,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: 28,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.white,
    // Supported natively since RN 0.76 and by react-native-web; the older
    // shadow*/elevation props are deprecated on web.
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)',
  },
  segmentText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.label,
  },
  segmentTextActive: {
    color: colors.text,
  },
  // Addresses run long, so they get a step down from the shared input size.
  inputEmail: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.lg + 4,
  },
  footerText: {
    fontSize: fontSize.small,
    color: colors.subtext,
  },
  footerLink: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
});
