import { StyleSheet } from 'react-native';
import { colors, feedback, spacing } from '../../theme';

// The notification spec has its own rounding, type ramp and chrome greys, so
// those numbers live here instead of in the shared theme scale.
const CARD_RADIUS = 16;
const BADGE_SIZE = 38;
const ACCENT_WIDTH = 4;

const ink = {
  message: '#6B7280',
  meta: '#A0A4B0',
  dismiss: '#B0B4C0',
  dismissPressed: '#F0F1F5',
};

export const styles = StyleSheet.create({
  // Fixed to the viewport rather than a screen, so toasts survive navigation
  // transitions instead of getting unmounted with the screen that triggered them.
  // Spans the full viewport and centres its children, so the stack sits in the
  // middle of the screen no matter how many toasts are up.
  stack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 999,
  },
  card: {
    maxWidth: 480,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingLeft: 18,
    paddingRight: 44,
    boxShadow:
      '0px 1px 2px rgba(16, 24, 40, 0.04), 0px 8px 20px rgba(16, 24, 40, 0.06)',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: ACCENT_WIDTH,
    borderRadius: ACCENT_WIDTH,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: ink.message,
  },
  meta: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ink.meta,
    marginTop: spacing.sm,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  dismiss: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissPressed: {
    backgroundColor: ink.dismissPressed,
  },
  dismissGlyph: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '600',
    color: ink.dismiss,
  },
});

/** Per-variant colours + badge glyph, keyed by ToastVariant. */
export const variants = {
  success: { ...feedback.success, glyph: '✓' },
  warning: { ...feedback.warning, glyph: '!' },
  error: { ...feedback.error, glyph: '✕' },
  info: { ...feedback.info, glyph: 'i' },
} as const;
