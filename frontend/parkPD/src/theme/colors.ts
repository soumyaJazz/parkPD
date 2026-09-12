export const colors = {
  background: '#FFFFFF',
  /** The tinted ground the white cards sit on. */
  surface: '#F0F2FA',
  text: '#111111',
  subtext: '#6B6D8A',
  label: '#8A8A8E',
  muted: '#9A9A9E',
  border: '#DCDEEB',
  /** Hairlines inside a card, where a full border would be too loud. */
  divider: '#EDEEF7',
  /**
   * Deeper than the indigo the hero fades into (#5B6EF5), which carries white
   * text at only 4.2:1. This one clears 5:1, so a filled button and a selected
   * day stay readable.
   */
  primary: '#4F5FE8',
  primaryPressed: '#3D4CD6',
  primaryDisabled: '#BFC5F5',
  accent: '#B5533C',
  error: '#D5473A',
  white: '#FFFFFF',
};

/**
 * The home screen's header wash. Darkest at the top left, which is where the
 * greeting and the name sit - white text on the pale end of this would be
 * around 3.3:1, so the copy stays on the deep half and nothing but empty space
 * reaches the light corner.
 */
export const brandGradient =
  'linear-gradient(135deg, #4A5AE8 0%, #6F63EC 55%, #8B7CF6 100%)';

/**
 * Semantic status palette shared by toasts, banners and inline alerts.
 * `fg` tints the icon and title, `bg` the icon badge, `line` the card border.
 */
export const feedback = {
  success: { fg: '#1B8A5A', bg: '#EAFBF3', line: '#B9EED4' },
  warning: { fg: '#B7791F', bg: '#FFF8E8', line: '#F5DFA0' },
  error: { fg: '#C4392B', bg: '#FDEEEC', line: '#F5C4BC' },
  info: { fg: '#2F4CDD', bg: '#EEF0FE', line: '#C7CFFB' },
} as const;

/**
 * The three states a stretch of the day can be in, on the Insights chart.
 *
 * Two shades of each, because the same green cannot do both jobs. `line` is
 * used for strokes and icons, where 3:1 is the bar - the shared `feedback`
 * greens and ambers clear that. `text` is the darker one, for the figures and
 * the words beside them, where the bar is 4.5:1 and `feedback.success.fg`
 * (4.35:1) and `feedback.warning.fg` (3.64:1) both fall short of it. Every
 * `text` here clears 5.3:1 on white, on `surface` and on its own `bg`.
 *
 * Colour is never the signal on its own - see `STATE_COPY` and `STATE_DASH` in
 * `screens/Insights/chart.ts`, which pair each state with a word, an icon and a
 * line pattern. These are what that pairing is drawn in.
 */
export const activity = {
  on: { line: '#1B8A5A', text: '#15704A', bg: '#EAFBF3', border: '#B9EED4' },
  transition: {
    line: '#B7791F',
    text: '#8A5A00',
    bg: '#FFF8E8',
    border: '#F5DFA0',
  },
  off: { line: '#C4392B', text: '#A32A1E', bg: '#FDEEEC', border: '#F5C4BC' },
  /**
   * The stretches with nothing recorded in them - the gap a dose leaves when
   * its peak was never noted, and the time before the first dose. Grey and
   * dotted, so it reads as absence rather than as a fourth state.
   */
  unrecorded: {
    line: '#8A8A8E',
    text: '#5A5A5E',
    bg: '#F0F2FA',
    border: '#DCDEEB',
  },
} as const;

/**
 * The day-cell states in the log calendar.
 *
 * Logged and in-progress are told apart by shape as well as hue - a filled dot
 * against a hollow ring - because two coloured dots differing only in colour
 * would be exactly the signal this project doesn't rely on. Both are darker
 * than the design's mint and honey, which land near 2:1 on white.
 */
export const calendar = {
  today: { ring: colors.primary, fg: colors.primary },
  logged: { dot: '#1E8A5F' },
  inProgress: { ring: '#B07C10' },
  selected: { bg: colors.primary, fg: colors.white },
  /**
   * Future days. Below the contrast bar on purpose and exempt from it: they
   * are not tappable, and reading as unavailable is the whole point.
   */
  future: '#C2C4D8',
} as const;
