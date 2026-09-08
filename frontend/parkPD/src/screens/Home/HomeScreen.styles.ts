import { StyleSheet } from 'react-native';
import {
  brandGradient,
  colors,
  feedback,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  radius,
  spacing,
} from '../../theme';

/** The project floor for anything tappable; 48 where there is room for it. */
const TARGET = 48;

export const styles = StyleSheet.create({
  // The tinted ground the white cards sit on.
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  /**
   * Explicitly flexed. A ScrollView carries its own flexGrow, but saying it
   * here is what pins the height to the screen rather than to the content -
   * and the day-log button below is outside the scroll for the same reason:
   * the one action this screen is for shouldn't be somewhere you scroll to.
   */
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.md,
  },

  // --- Hero ---------------------------------------------------------------
  hero: {
    paddingHorizontal: spacing.xl - 4,
    // Deep enough for the stats card to sit over the bottom of it.
    paddingBottom: 44,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    // The gradient is the picture; the flat colour is what shows if a platform
    // can't draw it, and it is the deep end rather than the pale one so white
    // text is safe either way.
    backgroundColor: '#4A5AE8',
    backgroundImage: brandGradient,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandText: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: letterSpacing.title,
  },
  /**
   * Solid white, not the design's translucent pill: white lettering on a 16%
   * white wash over indigo comes out around 3:1, and this is the only way to
   * the profile and to signing out.
   */
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TARGET - 4,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  menuButtonPressed: {
    backgroundColor: colors.primaryDisabled,
  },
  menuButtonText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  greeting: {
    fontSize: 17,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: letterSpacing.title,
  },

  // --- Stats --------------------------------------------------------------
  // Lifted over the bottom of the hero, which is what ties the two together.
  statsCard: {
    flexDirection: 'row',
    marginTop: -44,
    marginHorizontal: spacing.xl - 4,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.background,
    boxShadow: '0px 14px 40px rgba(30, 40, 90, 0.14)',
  },
  stat: {
    flex: 1,
    // A flex item on web won't shrink past its intrinsic width without this.
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.title,
  },
  statLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textAlign: 'center',
  },

  // --- Calendar section ---------------------------------------------------
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  /**
   * What the calendar has to say for itself before its marks arrive, or when
   * they never do. Said in words rather than as a spinner or a coloured edge:
   * a calendar with no marks looks exactly like a calendar for someone who has
   * never logged a day.
   */
  notice: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  noticeText: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.subtext,
  },
  // Semibold as well as red, so the difference from the line above doesn't
  // rest on colour alone.
  noticeError: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.semibold,
    color: feedback.error.fg,
  },
  retryButton: {
    minHeight: TARGET,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryButtonPressed: {
    backgroundColor: colors.surface,
  },
  retryText: {
    fontSize: fontSize.button,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // --- Pinned footer ------------------------------------------------------
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    boxShadow: '0px -6px 24px rgba(30, 40, 90, 0.08)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: 2,
  },
  selectionDate: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  logButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  logButtonText: {
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  // The resting state: nothing is picked, and the strip says what to do.
  hint: {
    fontSize: fontSize.button,
    lineHeight: lineHeight.body,
    color: colors.subtext,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // --- Menu drawer --------------------------------------------------------
  flex: {
    flex: 1,
  },
  drawerRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 22, 50, 0.35)',
    flexDirection: 'row',
  },
  // Width is set from the window, so the panel never squeezes the dimmed strip
  // that closes it off the side of a small phone.
  drawer: {
    paddingHorizontal: spacing.lg + 2,
    backgroundColor: colors.background,
    boxShadow: '12px 0px 40px rgba(20, 22, 50, 0.18)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    // Clear of the close button in the corner.
    paddingRight: TARGET,
    marginBottom: spacing.xl - 2,
  },
  drawerMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A5AE8',
    backgroundImage: brandGradient,
  },
  drawerBrand: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  drawerClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: TARGET,
    height: TARGET,
    borderRadius: TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  drawerClosePressed: {
    backgroundColor: colors.primaryDisabled,
  },
  menuSection: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TARGET + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs / 2,
  },
  menuItemActive: {
    backgroundColor: feedback.info.bg,
  },
  menuItemPressed: {
    backgroundColor: colors.surface,
  },
  menuIcon: {
    width: 20,
    alignItems: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontSize: fontSize.button + 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  menuItemLabelActive: {
    color: colors.primary,
  },
  menuItemLabelDestructive: {
    color: colors.error,
  },
  menuBadge: {
    // Clips the pill's background to its rounded corners on Android.
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: feedback.error.bg,
    color: feedback.error.fg,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
});
