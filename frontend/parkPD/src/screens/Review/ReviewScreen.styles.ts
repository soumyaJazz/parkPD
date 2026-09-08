import { StyleSheet } from 'react-native';
import {
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radius,
  spacing,
} from '../../theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingBottom: spacing.xl,
  },

  // --- The head of the page -------------------------------------------------
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: feedback.info.bg,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: feedback.info.fg,
    letterSpacing: letterSpacing.label,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    marginBottom: spacing.xl,
  },

  // --- One section of the day -----------------------------------------------
  card: {
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    boxShadow: '0px 6px 18px rgba(79, 95, 232, 0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  cardHeaderText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.subtext,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },

  /**
   * Label and value on one line, wrapping to two on a narrow screen rather than
   * squeezing the value into a column too thin to read.
   */
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    lineHeight: lineHeight.body,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: lineHeight.body,
    textAlign: 'right',
  },

  error: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    lineHeight: lineHeight.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submitNote: {
    fontSize: fontSize.small,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // --- The dialog that closes the day ---------------------------------------
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(20, 22, 50, 0.4)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: feedback.success.bg,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: fontSize.body,
    color: colors.subtext,
    lineHeight: lineHeight.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  modalButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  modalButtonText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
