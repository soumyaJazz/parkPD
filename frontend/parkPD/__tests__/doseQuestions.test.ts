/**
 * @format
 *
 * The ten dose questions: that they are all asked, that the two layouts agree
 * about which, and that what leaves the screen carries every answer.
 *
 * The page numbering is the part worth pinning down. A page is not a question -
 * two pages carry more than one - so the two numberings only ever agreed by
 * accident, and the accident ends the moment a question is added or moved.
 */

import {
  DONE,
  nextStep,
  selfAdvancing,
  validatePage,
} from '../src/screens/DoseLog/PagedFlow';
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
   * The first-improvement question shares its page with the two peak questions,
   * so the page it is on has to ask for all three before it will let anyone
   * past - pinned here because a page is not a question and nothing else says
   * which three are on it.
   */
  test('the first-improvement page also asks the two peak questions', () => {
    const upToFirstEffect = dose({
      doseTime: { hour: 8, minute: 0 },
      whole: 1,
      preMedActivityLevel: 30,
    });

    // The page the flow reaches once the three before it are answered.
    let step = 0;
    while (validatePage(upToFirstEffect, step) === null && step !== DONE) {
      step = nextStep(step, upToFirstEffect);
    }

    expect(validatePage(upToFirstEffect, step)).toBe(
      validateQuestion(upToFirstEffect, FIRST_EFFECT_QUESTION),
    );

    // Q4 answered, and the same page now asks Q5 - which is what "same page"
    // means. Q6 is the activity scale, which opens on a value.
    const firstEffectOnly = {
      ...upToFirstEffect,
      firstEffect: { hour: 8, minute: 30 },
    };
    expect(validatePage(firstEffectOnly, step)).toBe(
      validateQuestion(firstEffectOnly, FIRST_EFFECT_QUESTION + 1),
    );

    // And saying it never worked takes them back off, rather than holding the
    // dose at a page asking about a period that never began.
    const never = { ...upToFirstEffect, noFirstEffect: true };
    expect(validatePage(never, step)).toBeNull();
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

/**
 * A finished page moves itself on after a few seconds, which is only safe where
 * finishing it took a deliberate answer to every question on it.
 */
describe('which pages move themselves on', () => {
  /** Every page, by number - the closing card is not one. */
  const pages = Array.from({ length: DONE }, (_, step) => step);

  /**
   * The whole safety argument in one assertion.
   *
   * Two activity scales open on 50 and count as answered from the moment the
   * page is drawn, and the tablets question is complete after one of its two
   * rows. A page carrying any of those is already past `validatePage` before
   * the user has touched the thing it is asking about - so if it could also
   * move itself on, it would carry that untouched answer away with it.
   */
  test('no page moves itself on that an untouched dose could already leave', () => {
    for (const step of pages) {
      if (selfAdvancing(step)) {
        expect(validatePage(EMPTY_DOSE, step)).not.toBeNull();
      }
    }
  });

  test('the four pages whose last answer is a deliberate tap do', () => {
    expect(pages.filter(selfAdvancing)).toHaveLength(4);
  });

  /** It is the last card of the dose, and its button starts the next one. */
  test('the closing card does not', () => {
    expect(selfAdvancing(DONE)).toBe(false);
  });

  /**
   * The page the three questions were put on is the one this would have cost
   * the most: the peak activity scale is the last of the three and the furthest
   * down the page, so a jump on the peak time would take it unseen.
   */
  test('the page holding Q4, Q5 and Q6 does not', () => {
    const upToFirstEffect = dose({
      doseTime: { hour: 8, minute: 0 },
      whole: 1,
      preMedActivityLevel: 30,
    });
    let step = 0;
    while (validatePage(upToFirstEffect, step) === null && step !== DONE) {
      step = nextStep(step, upToFirstEffect);
    }
    expect(selfAdvancing(step)).toBe(false);
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
