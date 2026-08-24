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
