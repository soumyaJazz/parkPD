import { Text, TouchableOpacity, View } from 'react-native';
import { globalStyles } from '../../theme';
import { styles } from './StepHeader.styles';

type Props = {
  /** One-based, so "1" is the first step rather than "0". */
  step: number;
  totalSteps: number;
  title: string;
  /** The line under the title: what this step is about, in a sentence. */
  subtitle: string;
  onBack: () => void;
};

/**
 * The top of every step in a day's log: the way back, how far through this is,
 * and what is being asked for here.
 *
 * Shared rather than copied because the progress bar has to agree across the
 * four screens - a step that draws its own would be one more place for "3 of 4"
 * to disagree with the bar beside it.
 */
function StepHeader({ step, totalSteps, title, subtitle, onBack }: Props) {
  return (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <View style={styles.chevron} />
      </TouchableOpacity>

      <Text style={styles.stepLabel}>{`Step ${step} of ${totalSteps}`}</Text>
      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: totalSteps, now: step }}
      >
        <View
          style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]}
        />
      </View>

      <Text style={globalStyles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );
}

export default StepHeader;
