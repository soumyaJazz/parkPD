export const colors = {
  background: '#FFFFFF',
  surface: '#F2F2F5',
  text: '#111111',
  subtext: '#6B6B6F',
  label: '#8A8A8E',
  muted: '#9A9A9E',
  border: '#D6D6DA',
  primary: '#2F4CDD',
  primaryPressed: '#253CB0',
  primaryDisabled: '#AEB9F0',
  accent: '#B5533C',
  error: '#D5473A',
  white: '#FFFFFF',
};

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
