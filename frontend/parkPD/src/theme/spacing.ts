export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 30,
} as const;

export const radius = {
  sm: 8,
  md: 10,
} as const;

/** Horizontal gutter every screen shares. */
export const screenPadding = 24;

/** Floors for the safe-area insets, so notchless devices still get breathing room. */
export const minInset = {
  top: 16,
  bottom: 24,
} as const;

/**
 * How wide the app itself is ever drawn.
 *
 * The web build is held phone-shaped by `#root { max-width: 480px }` in
 * `index.html`, and the two have to agree: the layouts here are measured in
 * points off a known width rather than in percentages, so a width that lies is
 * a grid that overflows. Native has no such shell, which is what `useAppWidth`
 * exists to say.
 */
export const APP_MAX_WIDTH = 480;
