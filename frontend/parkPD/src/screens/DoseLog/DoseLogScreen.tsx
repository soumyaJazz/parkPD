import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { minInset, screenPadding, spacing } from '../../theme';
import type { DoseDraft } from '../../types/doseLog';
import { EMPTY_DOSE, toDoseLog } from '../../types/doseLog';
import { parseTime24 } from '../../utils/date';
import PagedFlow, { DONE, nextStep, validatePage } from './PagedFlow';
import ScrollFlow, { firstMissing } from './ScrollFlow';
import type { DoseContext } from './questions';
import { TIMELINE_INSET, scrollStyles, styles } from './DoseLogScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'DoseLog'>;

/** Where in the day's log a given screen is. */
type Place = { dose: number; step: number };

/**
 * The nine dose questions, asked once for every dose in the day.
 *
 * This screen owns the answers and where the user is in them; how the questions
 * are arranged is the layout's business. Two exist - one question to a screen,
 * or all of them down one scrolling page - and which one runs is the preference
 * the user gave during setup, not a decision made here.
 *
 * The doses chain: the offsets on "when did you take it" are measured from when
 * you woke up for the first, and from when the one before it wore off after
 * that. That is why the whole day is one screen rather than one per dose.
 */
function DoseLogScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { morning, plan } = route.params;
  const totalDoses = plan.num_doses;

  const [doses, setDoses] = useState<DoseDraft[]>(() =>
    Array.from({ length: totalDoses }, () => EMPTY_DOSE),
  );
  /**
   * Where the user has been, not merely where they are. Back has to retrace the
   * path actually taken, and that path skips six questions whenever a dose
   * turns out never to have worked.
   */
  const [history, setHistory] = useState<Place[]>([{ dose: 0, step: 0 }]);
  const [error, setError] = useState<string | null>(null);
  /** Which question the error belongs to, so the scrolling layout can place it. */
  const [errorAt, setErrorAt] = useState<number | null>(null);

  const here = history[history.length - 1];
  const dose = doses[here.dose];
  const isScrolling = user?.dose_mode === 'scroll';

  const set = <K extends keyof DoseDraft>(key: K, value: DoseDraft[K]) => {
    setDoses(previous =>
      previous.map((entry, index) =>
        index === here.dose ? { ...entry, [key]: value } : entry,
      ),
    );
    setError(null);
    setErrorAt(null);
  };

  const context: DoseContext = {
    dose,
    doseNumber: here.dose + 1,
    medicine: plan.medicine_name,
    wakeTime: parseTime24(morning.wake_time),
    previous: here.dose > 0 ? doses[here.dose - 1] : null,
    // What each layout takes out of the window before a question gets its
    // width: the screen's gutter for both, plus the timeline rail and the
    // card's own padding when the questions are laid out as cards.
    insetX: isScrolling
      ? screenPadding * 2 + TIMELINE_INSET + spacing.lg * 2
      : screenPadding * 2,
    set,
  };

  const topInset = Math.max(minInset.top, insets.top);
  const bottomInset = Math.max(minInset.bottom, insets.bottom);

  /** Moves to the next dose, or finishes the day's doses. */
  const leaveDose = () => {
    if (here.dose + 1 < totalDoses) {
      setHistory(past => [...past, { dose: here.dose + 1, step: 0 }]);
      return;
    }
    // The doses are done, so the day's remaining questions - the ones asked
    // once rather than once per dose - are what comes next. Handed on in the
    // shape they will be sent in, the way every step here hands the next
    // everything gathered so far.
    navigation.navigate('OtherMeds', {
      date: route.params.date,
      morning,
      plan,
      doses: doses.map(toDoseLog),
    });
  };

  const handleContinue = () => {
    if (here.step === DONE) {
      leaveDose();
      return;
    }

    const missing = validatePage(dose, here.step);
    if (missing !== null) {
      setError(missing);
      showToast('This question still needs an answer', missing, 'warning');
      return;
    }

    setHistory(past => [...past, { dose: here.dose, step: nextStep(here.step, dose) }]);
    setError(null);
  };

  const handleBack = () => {
    if (history.length === 1) {
      navigation.goBack();
      return;
    }
    setHistory(past => past.slice(0, -1));
    setError(null);
    setErrorAt(null);
  };

  /** The scrolling layout saves a whole dose at once, so it checks all nine. */
  const handleSave = () => {
    const missing = firstMissing(dose);
    if (missing !== null) {
      setError(missing.message);
      setErrorAt(missing.index);
      showToast(
        `Question ${missing.index + 1} still needs an answer`,
        missing.message,
        'warning',
      );
      return;
    }
    setError(null);
    setErrorAt(null);
    leaveDose();
  };

  return (
    <KeyboardAvoidingView
      // The two layouts sit on different grounds: cards on the tinted surface,
      // one question at a time on white.
      style={isScrolling ? scrollStyles.screen : styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {isScrolling ? (
        <ScrollFlow
          context={context}
          totalDoses={totalDoses}
          error={error}
          errorAt={errorAt}
          topInset={topInset}
          bottomInset={bottomInset}
          onSave={handleSave}
        />
      ) : (
        <PagedFlow
          context={context}
          totalDoses={totalDoses}
          step={here.step}
          error={error}
          topInset={topInset}
          bottomInset={bottomInset}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      )}
    </KeyboardAvoidingView>
  );
}

export default DoseLogScreen;
