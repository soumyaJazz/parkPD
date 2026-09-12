/**
 * @format
 *
 * The ten dose questions: that they are all asked, that the two layouts agree
 * about which, and that what leaves the screen carries every answer.
 *
 * The page numbering is the part worth pinning down. A page is not a question -
 * two pages hold a pair - so the two numberings only ever agreed by accident,
 * and the accident ends the moment a question is added or moved.
 */

import { DONE, nextStep, validatePage } from '../src/screens/DoseLog/PagedFlow';
import {
  FIRST_EFFECT_QUESTION,
  QUESTION_COUNT,
  askedQuestions,
  validateQuestion,
} from '../src/screens/DoseLog/questions';
import { ACTIVITY_LEVEL, EMPTY_DOSE, toDoseLogs } from '../src/types/doseLog';
import type { DoseDraft } from '../src/types/doseLog';

function dose(answers: Partial<DoseDraft> = {}): DoseDraft {
  return { ...EMPTY_DOSE, ...answers };
}

/** A dose answered all the way through, for the payload tests below. */
const WORKED = dose({
  doseTime: { hour: 8, minute: 0 },
  whole: 1,
  preMedActivityLevel: 30,
  firstEffect: { hour: 8, minute: 30 },
  peakEffect: { hour: 9, minute: 0 },
  activityLevel: 80,
  peakAdl: 'functional',
  dyskinesia: false,
  wearOff: { hour: 13, minute: 0 },
  offAdl: 'limited',
});

/** The wake-up instant the day's clock starts from - 7 AM local. */
const WOKE_AT = new Date(2026, 8, 11, 7, 0).toISOString();

describe('which questions a dose is asked', () => {
  test('a dose that worked is asked all ten', () => {
    expect(askedQuestions(WORKED)).toHaveLength(QUESTION_COUNT);
  });

  /**
   * The three before the first-effect question are the ones every dose carries:
   * when it was taken, how active you were beforehand, and how much you took.
   * All three are answerable before the medicine has done anything.
   */
  test('a dose that never worked is still asked the four up to that point', () => {
    const asked = askedQuestions(dose({ noFirstEffect: true }));
    expect(asked).toEqual([0, 1, 2, 3]);
    expect(asked[asked.length - 1]).toBe(FIRST_EFFECT_QUESTION);
  });

  test('the activity level before a dose opens on a value, so it is never missing', () => {
    expect(EMPTY_DOSE.preMedActivityLevel).toBe(ACTIVITY_LEVEL.initial);
    expect(validateQuestion(EMPTY_DOSE, 1)).toBeNull();
  });
});

describe('the paged layout', () => {
  /** The pages a dose actually walks, in order, ending at the closing card. */
  function walk(draft: DoseDraft): number[] {
    const visited = [0];
    let step = 0;
    // A ceiling rather than a bare while: a numbering mistake that made the
    // flow loop should fail this test, not hang it.
    for (let guard = 0; guard <= DONE && step !== DONE; guard += 1) {
      // Every page the flow leads to has to be one this dose can answer. This
      // is what catches a step that lands somewhere it was never sent.
      expect(validatePage(draft, step)).toBeNull();
      step = nextStep(step, draft);
      visited.push(step);
    }
    return visited;
  }

  test('a dose answered all through walks every page', () => {
    const visited = walk(WORKED);
    expect(visited[visited.length - 1]).toBe(DONE);
    expect(visited).toHaveLength(DONE + 1);
  });

  /**
   * The bug this guards: `nextStep` compared a page index against a question
   * index, which held only while every page carried exactly one question.
   * Adding the pre-dose question broke that, and a dose with no improvement
   * would have been carried on to the peak question instead of being closed.
   */
  test('no improvement closes the dose early', () => {
    const skipped = dose({
      doseTime: { hour: 8, minute: 0 },
      whole: 1,
      preMedActivityLevel: 40,
      noFirstEffect: true,
    });

    const visited = walk(skipped);
    expect(visited[visited.length - 1]).toBe(DONE);
    // Short of the full walk: that is what "closes early" means.
    expect(visited.length).toBeLessThan(DONE + 1);
  });
});

describe('what is sent', () => {
  test('a dose that worked carries the activity level before it', () => {
    const [sent] = toDoseLogs([WORKED], '2026-09-11', WOKE_AT);
    expect(sent.pre_med_al_pct).toBe(30);
    expect(sent.pal_pct).toBe(80);
  });

  /**
   * The one that is easy to get wrong: a dose that never worked drops the six
   * answers below the first-effect question, and this is not one of them - it
   * was asked and answered before the medicine had done anything.
   */
  test('a dose that never worked still carries it', () => {
    const never = dose({
      doseTime: { hour: 8, minute: 0 },
      whole: 1,
      preMedActivityLevel: 40,
      noFirstEffect: true,
    });
    const [sent] = toDoseLogs([never], '2026-09-11', WOKE_AT);

    expect(sent.pre_med_al_pct).toBe(40);
    expect(sent.first_effect_time).toBe('no-effect');
    expect(sent.pal_pct).toBeNull();
    expect(sent.peak_effect_time).toBeNull();
  });
});
