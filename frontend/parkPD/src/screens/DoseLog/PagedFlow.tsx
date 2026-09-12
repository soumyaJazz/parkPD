import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ComponentRef } from 'react';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import type { DoseDraft } from '../../types/doseLog';
import { DoseDone, DoseHeader } from './parts';
import type { DoseContext } from './questions';
import {
  FIRST_EFFECT_QUESTION,
  QUESTION_COUNT,
  buildQuestions,
  validateQuestion,
} from './questions';
import { styles } from './DoseLogScreen.styles';

/**
 * Which questions share a screen.
 *
 * Most of them get one to themselves: they are long, several need a paragraph
 * of explanation before they can be answered, and one opens three more
 * underneath it. Two pairs are the exception, and for the same reason both
 * times - the second question reads as a follow-up to the first rather than as
 * a new subject, so splitting them would cost the reader the context.
 *
 * Q1 and Q2 are one pair: how active you were "just before this dose" is a
 * window that ends at the time named directly above it. Q6 and Q7 are the
 * other: both are about the same peak period.
 */
const PAGES: ReadonlyArray<readonly number[]> = [
  [0, 1],
  [2],
  [3],
  [4],
  [5, 6],
  [7],
  [8],
  [9],
];

/** The card that closes the dose sits one past the last page. */
export const DONE = PAGES.length;

/**
 * The page carrying the question that can end a dose early.
 *
 * Looked up rather than written down. A page is not a question - two of them
 * hold a pair - so the two numberings only ever agreed by accident, and they
 * stopped agreeing the moment a question was added above this one. Deriving it
 * means the layout above is the only place that has to be right.
 */
const FIRST_EFFECT_PAGE = PAGES.findIndex(page =>
  page.includes(FIRST_EFFECT_QUESTION),
);

/** Where in the ten a page starts and ends, for "Questions 6 and 7 of 10". */
function pageLabel(page: readonly number[]): string {
  if (page.length === 1) {
    return `Question ${page[0] + 1} of ${QUESTION_COUNT}`;
  }
  const numbers = page.map(index => index + 1);
  return `Questions ${numbers.slice(0, -1).join(', ')} and ${
    numbers[numbers.length - 1]
  } of ${QUESTION_COUNT}`;
}

/** The page after this one, or the closing card when the dose ends here. */
export function nextStep(step: number, dose: DoseDraft): number {
  if (step === FIRST_EFFECT_PAGE && dose.noFirstEffect) {
    return DONE;
  }
  return Math.min(step + 1, DONE);
}

type Props = {
  context: DoseContext;
  totalDoses: number;
  /** The page on screen; `DONE` is the card that closes the dose. */
  step: number;
  error: string | null;
  topInset: number;
  bottomInset: number;
  onContinue: () => void;
  onBack: () => void;
};

/**
 * One question to a screen, with a Back and a Continue under it.
 *
 * The mode for anyone who would rather be asked one thing at a time - it is
 * what the profile questionnaire calls "one question at a time", and it is the
 * default when no preference has been saved.
 */
function PagedFlow({
  context,
  totalDoses,
  step,
  error,
  topInset,
  bottomInset,
  onContinue,
  onBack,
}: Props) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const questions = buildQuestions(context);
  const isDone = step === DONE;
  const isLastDose = context.doseNumber >= totalDoses;

  // Each page starts at the top of itself, rather than wherever the last one
  // happened to be scrolled to.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step, context.doseNumber]);

  return (
    <>
      <DoseHeader
        dose={context.doseNumber}
        totalDoses={totalDoses}
        // Progress is measured in questions, not pages - "5 and 6 of 9" has to
        // move the bar by two.
        answered={
          isDone ? QUESTION_COUNT : PAGES[step][PAGES[step].length - 1] + 1
        }
        totalQuestions={QUESTION_COUNT}
        label={isDone ? null : pageLabel(PAGES[step])}
        topInset={topInset}
      />

      <ScrollView
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {isDone ? (
          <DoseDone
            dose={context.doseNumber}
            totalDoses={totalDoses}
            skipped={context.dose.noFirstEffect}
          />
        ) : (
          <>
            {PAGES[step].map((index, position) => {
              const current = questions[index];
              return (
                <View
                  key={index}
                  // A rule between two questions sharing a screen, so the
                  // second reads as its own question rather than as more of
                  // the first.
                  style={position > 0 ? styles.nextQuestion : undefined}
                >
                  <Text style={styles.question}>
                    {`Q${index + 1}. ${current.title}`}
                  </Text>
                  {current.subtitle ? (
                    <Text style={styles.subtitle}>{current.subtitle}</Text>
                  ) : null}
                  {current.explainer ? (
                    <View style={styles.explainer}>
                      <Text style={styles.explainerText}>
                        {current.explainer}
                      </Text>
                    </View>
                  ) : null}
                  {current.body}
                </View>
              );
            })}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to the previous question"
        >
          <Icon name="chevronLeft" size={13} color={colors.subtext} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.continue,
            pressed && styles.continuePressed,
          ]}
          onPress={onContinue}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>
            {isDone
              ? isLastDose
                ? 'Finish doses'
                : `Log dose ${context.doseNumber + 1}`
              : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/** What is still missing on the page in front of the user. */
export function validatePage(dose: DoseDraft, step: number): string | null {
  if (step === DONE) {
    return null;
  }
  for (const index of PAGES[step]) {
    const missing = validateQuestion(dose, index);
    if (missing !== null) {
      return missing;
    }
  }
  return null;
}

export default PagedFlow;
