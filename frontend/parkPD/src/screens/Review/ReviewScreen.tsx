import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitDailyLog } from '../../api';
import Icon from '../../components/Icon';
import StepHeader from '../../components/StepHeader';
import { showToast } from '../../components/Toast';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, feedback, globalStyles, minInset } from '../../theme';
import { toDailyLog } from '../../types/dailyLog';
import { formatFullDate, parseDayKey } from '../../utils/date';
import { LoggedDialog, ReviewCard } from './parts';
import { buildSections } from './summary';
import { styles } from './ReviewScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

/** The morning, then the doses, then the common questions, then this. */
const STEP = 4;
const TOTAL_STEPS = 4;

/**
 * The last step: the whole day laid out, then sent.
 *
 * Everything shown here is read back out of what will actually be submitted -
 * `route.params` is the payload's own parts - rather than out of the drafts the
 * screens held. A review built from anything else would be reassuring the user
 * about a different day than the one that goes up.
 *
 * The day goes up in a single request: a half-saved day would show as logged on
 * the calendar while missing its doses, which is worse than one not saved at
 * all.
 */
function ReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogged, setLogged] = useState(false);

  const sections = useMemo(() => buildSections(route.params), [route.params]);
  const day = useMemo(
    () => formatFullDate(parseDayKey(route.params.date)),
    [route.params.date],
  );

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = toDailyLog(route.params);

    // Every answer the day collected, in the shape it goes up in - printed
    // before the request rather than after it, so it is there to read whether
    // or not the server takes it.
    if (__DEV__) {
      console.log(
        `[daily log] submitting ${route.params.date}\n${JSON.stringify(
          payload,
          null,
          2,
        )}`,
      );
    }

    try {
      const { message } = await submitDailyLog(payload);
      showToast('Day logged', message);
      setLogged(true);
    } catch (submitError) {
      const failure =
        submitError instanceof Error
          ? submitError.message
          : 'Could not save today’s log. Please try again.';
      setError(failure);
      showToast(failure, undefined, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Back to the start rather than back one screen: the day is saved, and every
   * screen behind this one is a form for a day that no longer needs filling in.
   */
  const handleDone = () => {
    setLogged(false);
    navigation.popToTop();
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(minInset.top, insets.top),
          paddingBottom: Math.max(minInset.bottom, insets.bottom),
        },
      ]}
    >
      <ScrollView
        style={globalStyles.screen}
        contentContainerStyle={styles.content}
      >
        <StepHeader
          step={STEP}
          totalSteps={TOTAL_STEPS}
          title="Review and submit"
          subtitle={`Check everything below before you send ${day}.`}
          onBack={navigation.goBack}
        />

        <View style={styles.badge}>
          <Icon name="check" size={13} color={feedback.info.fg} />
          <Text style={styles.badgeText}>FINAL REVIEW</Text>
        </View>
        <Text style={styles.subtitle}>
          Anything that looks wrong can still be changed — press Back to return
          to that question.
        </Text>

        {sections.map(section => (
          <ReviewCard key={section.title} section={section} />
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.submitNote}>
          This saves the day to your log. You can look at it again afterwards.
        </Text>
        <TouchableOpacity
          style={[
            globalStyles.button,
            isSubmitting ? null : globalStyles.buttonReady,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={globalStyles.buttonText}>Submit today’s log</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LoggedDialog visible={isLogged} day={day} onDismiss={handleDone} />
    </View>
  );
}

export default ReviewScreen;
