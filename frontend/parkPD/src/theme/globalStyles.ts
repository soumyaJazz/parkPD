import { Platform, StyleSheet } from 'react-native';
import { colors } from './colors';
import { radius, screenPadding, spacing } from './spacing';
import { fontSize, fontWeight, letterSpacing, lineHeight } from './typography';

/**
 * Style rules shared across screens. Screen-specific rules live in that
 * screen's own styles file and are composed on top of these.
 */
export const globalStyles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: screenPadding,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.title,
    marginBottom: 14,
  },
  subtext: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.subtext,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: 14,
  },
  // Underline field shared by the phone/email input and the OTP boxes.
  input: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    // Left flush with the label above it, so the underline reads as one column.
    paddingHorizontal: 0,
    ...Platform.select({
      /**
       * The 8px that suits a touch target looks thin on web, where the field
       * sits beside a 52px segmented control and a 56px button.
       */
      web: { paddingVertical: 15 },
      default: { paddingVertical: spacing.sm },
    }),
  },
  inputActive: {
    borderBottomColor: colors.primary,
  },
  inputError: {
    borderBottomColor: colors.error,
  },
  // Reserves a row so the layout doesn't jump when a message appears.
  errorText: {
    fontSize: fontSize.caption,
    color: colors.error,
    minHeight: 18,
    marginTop: spacing.sm,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxl,
  },
  // Takes the free height above a pinned footer and centres its children in it.
  contentCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primaryDisabled,
  },
  buttonReady: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
  },
});
