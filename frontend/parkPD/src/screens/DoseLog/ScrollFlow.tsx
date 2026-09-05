import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ComponentRef } from 'react';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import type { DoseDraft } from '../../types/doseLog';
import { ordinal } from '../../utils/date';
import { DoseBadge } from './parts';
import type { DoseContext } from './questions';
import {
  QUESTION_COUNT,
  askedQuestions,
  buildQuestions,
  isAnswered,
  validateQuestion,
} from './questions';
import { scrollStyles as styles } from './DoseLogScreen.styles';

type Props = {
  context: DoseContext;
  totalDoses: number;
  error: string | null;
  /** Which question the error belongs to, so it lands on the right card. */
  errorAt: number | null;
  topInset: number;
  bottomInset: number;
  onSave: () => void;
};

/**
 * Every question of one dose on a single page, down a timeline.
 *
 * The mode for anyone who would rather see the whole thing at once - what the
 * profile questionnaire calls "all on one scrollable page". It asks exactly the
 * same nine questions, in the same words, with the same follow-ups: only the
 * arrangement differs, which is why both layouts are built from one definition.
 *
 * One dose is on the page at a time. The next is shown as what it is - a thing
 * that opens once this one is saved - rather than as nine more cards to scroll
 * past on the way to the button.
 */
function ScrollFlow({
  context,
  totalDoses,
  error,
  errorAt,
  topInset,
  bottomInset,
  onSave,
}: Props) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const questions = buildQuestions(context);
  const { dose, doseNumber } = context;

  const asked = askedQuestions(dose);
  const answered = asked.filter(index => isAnswered(dose, index)).length;
  const isLastDose = doseNumber >= totalDoses;

  // A new dose starts at the top, rather than wherever the last one was left.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [doseNumber]);

  return (
    <>
      <View style={[styles.stickyHeader, { paddingTop: topInset + 12 }]}>
        <DoseBadge dose={doseNumber} totalDoses={totalDoses} />
        <View style={styles.answeredPill}>
          <Text
            style={styles.answeredText}
            accessibilityLabel={`${answered} of ${asked.length} questions answered`}
          >
            <Text style={styles.answeredCount}>{answered}</Text>
            {`/${asked.length} answered`}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.timeline}>
          <View style={styles.rail} />

          {asked.map(index => {
            const current = questions[index];
            const done = isAnswered(dose, index);
            return (
              <View key={index} style={styles.card}>
                {/* The number on the rail, filled once the question is done -
                    and carrying a tick, so the state is a shape as well as a
                    colour. */}
                <View style={[styles.dot, done && styles.dotAnswered]}>
                  {done ? (
                    <Icon name="check" size={12} color={colors.white} />
                  ) : (
                    <Text style={styles.dotText}>{index + 1}</Text>
                  )}
                </View>

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
                {errorAt === index && error ? (
                  <Text style={styles.error}>{error}</Text>
                ) : null}
              </View>
            );
          })}

          {/* Says where the missing six went, rather than letting them simply
              vanish off the page. */}
          {dose.noFirstEffect && (
            <View style={styles.skipNotice}>
              <Text style={styles.skipNoticeText}>
                {`You logged no motor improvement for this dose, so questions 4 to ${QUESTION_COUNT} are not asked — there is nothing further to measure this cycle.`}
              </Text>
            </View>
          )}
        </View>

        {!isLastDose && (
          <>
            <View style={styles.transition}>
              <View style={styles.transitionLine} />
              <Text style={styles.transitionLabel}>
                {`DOSE ${doseNumber} ENDS · DOSE ${doseNumber + 1} BEGINS`}
              </Text>
              <View style={styles.transitionLine} />
            </View>
            <View style={styles.teaser}>
              <Text style={styles.teaserText}>
                {`Your ${ordinal(
                  doseNumber + 1,
                )} dose opens here once you save this one.`}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: bottomInset }]}>
        <Pressable
          style={({ pressed }) => [styles.save, pressed && styles.savePressed]}
          onPress={onSave}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>
            {isLastDose
              ? `Save dose ${doseNumber} & finish`
              : `Save dose ${doseNumber} & continue`}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/** The first unanswered question on the page, and what it still needs. */
export function firstMissing(
  dose: DoseDraft,
): { index: number; message: string } | null {
  for (const index of askedQuestions(dose)) {
    const message = validateQuestion(dose, index);
    if (message !== null) {
      return { index, message };
    }
  }
  return null;
}

export default ScrollFlow;
