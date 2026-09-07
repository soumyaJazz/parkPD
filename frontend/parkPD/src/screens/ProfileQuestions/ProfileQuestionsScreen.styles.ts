import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.md,
    marginBottom: spacing.md,
  },
  // A square showing only two borders, rotated into a "<".
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    transform: [{ rotate: '45deg' }],
  },
  subtext: {
    marginBottom: spacing.xxl,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
