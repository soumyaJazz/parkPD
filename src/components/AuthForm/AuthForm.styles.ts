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
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
