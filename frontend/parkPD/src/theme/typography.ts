import type { TextStyle } from 'react-native';

export const fontSize = {
  caption: 13,
  small: 14,
  body: 15,
  button: 16,
  input: 22,
  title: 26,
} as const;

export const fontWeight: Record<
  'regular' | 'semibold' | 'bold',
  TextStyle['fontWeight']
> = {
  regular: '400',
  semibold: '600',
  bold: '700',
};

export const lineHeight = {
  body: 22,
} as const;

export const letterSpacing = {
  title: -0.3,
  label: 0.4,
} as const;
