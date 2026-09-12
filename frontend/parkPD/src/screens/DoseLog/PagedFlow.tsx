import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { ComponentRef } from 'react';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import type { DoseDraft } from '../../types/doseLog';
import { EMPTY_DOSE } from '../../types/doseLog';
import { DoseDone, DoseHeader } from './parts';
import type { DoseContext } from './questions';
import {
  FIRST_EFFECT_QUESTION,
  QUESTION_COUNT,
  askedQuestions,
  buildQuestions,
  validateQuestion,
} from './questions';
import { styles } from './DoseLogScreen.styles';

/**
 * Which questions share a screen.
 *
 * Some get one to themselves: they are long, several need a paragraph of
 * explanation before they can be answered, and one opens three more underneath
 * it. The groups are the exception, and for the same reason every time - the
 * questions after the first read as follow-ups to it rather than as new
 * subjects, so splitting them would cost the reader the context.
 *
 * Q1 and Q2 are one: how active you were "just before this dose" is a window
 * that ends at the time named directly above it. Q4, Q5 and Q6 are the other -
 * one arc through the same dose, from the first improvement to the peak and how
 * active the peak left you - and all three are counted from the one dose time
 * their subtitles repeat.
 */
const PAGES: ReadonlyArray<readonly number[]> = [
  [0, 1],
  [2],
  [3, 4, 5],
  [6],
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
 * carry more than one - so the two numberings only ever agreed by accident, and
 * they stopped agreeing the moment a question was added above this one.
 * Deriving it means the layout above is the only place that has to be right.
 */
const FIRST_EFFECT_PAGE = PAGES.findIndex(page =>
  page.includes(FIRST_EFFECT_QUESTION),
);

/**
 * The questions a page actually puts on screen.
 *
 * A page is a fixed list; which of its questions are asked is not. The
 * first-effect question shares its page with the two peak questions, so
 * answering "no motor improvement" has to take those two off the page they sit
 * on - leaving two questions about a period that never began directly under the
 * answer saying it never began would be asking for them anyway.
 *
 * A page left with nothing falls back to the page as written. The flow closes
 * the dose before reaching one, so this is a floor rather than a case: a blank
 * screen with a Continue button under it is the worse way to be wrong.
 */
function pageQuestions(dose: DoseDraft, step: number): readonly number[] {
  const asked = askedQuestions(dose);
  const shown = PAGES[step].filter(index => asked.includes(index));
  return shown.length > 0 ? shown : PAGES[step];
}

/**
 * How long a finished page waits before it moves itself on.
 *
 * Long enough to read the sentence saying it is about to happen and reach the
 * button that stops it, which is the whole reason there is a delay rather than
 * a jump. Four seconds rather than the two an auto-advance usually gets: the
 * people filling this in are the reason the rest of this screen is sized the
 * way it is.
 */
export const AUTO_ADVANCE_SECONDS = 4;

/**
 * Questions whose answer can still be added to after it first reads as
 * complete.
 *
 * Only the tablets question: it is two rows, whole tablets and a part tablet,
 * and either one on its own is already a dose. Someone taking one and a half
 * has answered it after tapping "1" - a page that left on that would record the
 * dose as one tablet and never show them the row they were reaching for.
 */
const EXTENDABLE = new Set<number>([2]);

/**
 * Whether a page may move itself on once it is answered.
 *
 * Two things have to be true of every question on it. It must need a deliberate
 * answer - `validateQuestion` turning down an untouched dose is what says so,
 * and it is what rules out the two activity scales, which open on 50 and count
 * as answered before they have been looked at. And it must not be extendable,
 * above.
 *
 * Derived rather than listed, for the reason the page map itself is: a list of
 * page numbers here would be a third numbering to keep in step with the other
 * two, and it would be wrong the first time a question moved.
 */
export function selfAdvancing(step: number): boolean {
  return (
    step !== DONE &&
    PAGES[step].every(
      index =>
        validateQuestion(EMPTY_DOSE, index) !== null && !EXTENDABLE.has(index),
    )
  );
}

/** Where in the ten a page starts and ends, for "Questions 4, 5 and 6 of 10". */
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
  // What this page is asking right now, which is not always what it holds.
  const shown = isDone ? [] : pageQuestions(context.dose, step);
  // The page as written still had questions on it that this answer removed.
  const dropped = !isDone && shown.length < PAGES[step].length;

  /** Seconds left before this page moves itself on, or null if it is not. */
  const [countdown, setCountdown] = useState<number | null>(null);
  /** Set by "Stay on this page", and cleared when the page changes. */
  const [stayed, setStayed] = useState(false);
  const [screenReader, setScreenReader] = useState(false);

  // Each page starts at the top of itself, rather than wherever the last one
  // happened to be scrolled to.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step, context.doseNumber]);

  // A page asked to stay put stays put only until it is left - the next page
  // is a new question, and gets to offer again.
  useEffect(() => {
    setStayed(false);
  }, [step, context.doseNumber]);

  /**
   * Auto-advance is off under a screen reader.
   *
   * The screen moving on by itself is the one thing a reader cannot keep up
   * with: it is partway through reading the answer aloud when the page it is
   * describing is replaced. Read once on mount and then watched, because it can
   * be switched on while this screen is open.
   */
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then(on => {
      if (live) {
        setScreenReader(on);
      }
    });
    const watch = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReader,
    );
    return () => {
      live = false;
      watch.remove();
    };
  }, []);

  /**
   * Whether this page is, right now, one that will move itself on.
   *
   * `validatePage` rather than a count of answers, so it is the same question
   * the Continue button asks - a page that would move itself on is by
   * definition one that would let the user past.
   */
  const arming =
    !isDone &&
    !stayed &&
    !screenReader &&
    selfAdvancing(step) &&
    validatePage(context.dose, step) === null;

  /**
   * `onContinue` through a ref, not a dependency.
   *
   * The screen above rebuilds it every render, so a dependency on it would
   * restart the countdown several times a second and it would never reach zero.
   */
  const advance = useRef(onContinue);
  advance.current = onContinue;

  useEffect(() => {
    if (!arming) {
      setCountdown(null);
      return;
    }
    // `context.dose` is in the deps, so changing an answer starts the count
    // again from the top rather than leaving the user the remainder of it.
    setCountdown(AUTO_ADVANCE_SECONDS);
    const tick = setInterval(
      () => setCountdown(left => (left === null ? null : left - 1)),
      1000,
    );
    const go = setTimeout(() => advance.current(), AUTO_ADVANCE_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [arming, step, context.doseNumber, context.dose]);

  return (
    <>
      <DoseHeader
        dose={context.doseNumber}
        totalDoses={totalDoses}
        // Progress is measured in questions, not pages - a page holding three
        // of them has to move the bar by three.
        answered={isDone ? QUESTION_COUNT : shown[shown.length - 1] + 1}
        totalQuestions={QUESTION_COUNT}
        label={isDone ? null : pageLabel(shown)}
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
            {shown.map((index, position) => {
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
            {/* Says where the questions that left the page went, rather than
                letting them vanish from under the answer that removed them. */}
            {dropped && (
              <View style={styles.skipNotice}>
                <Text style={styles.skipNoticeText}>
                  {`You logged no motor improvement for this dose, so questions ${
                    FIRST_EFFECT_QUESTION + 2
                  } to ${QUESTION_COUNT} are not asked — there is nothing further to measure this cycle.`}
                </Text>
              </View>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      {countdown !== null && countdown > 0 && (
        <View style={styles.autoAdvance}>
          <Text
            style={styles.autoAdvanceText}
            // Said in words as well as counted, because the count alone is a
            // number changing in the corner of a screen someone is reading.
            accessibilityLiveRegion="polite"
          >
            {`All answered. Moving to the next question in ${countdown} second${
              countdown === 1 ? '' : 's'
            }.`}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.stay,
              pressed && styles.stayPressed,
            ]}
            onPress={() => setStayed(true)}
            accessibilityRole="button"
            accessibilityLabel="Stay on this page and do not move on"
          >
            <Text style={styles.stayText}>Stay on this page</Text>
          </Pressable>
        </View>
      )}

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
  for (const index of pageQuestions(dose, step)) {
    const missing = validateQuestion(dose, index);
    if (missing !== null) {
      return missing;
    }
  }
  return null;
}

export default PagedFlow;
