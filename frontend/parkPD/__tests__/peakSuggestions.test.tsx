/**
 * @format
 *
 * What the peak question counts its suggestions from.
 *
 * The dose time is the wrong thing to offer here. "90 mins after taking
 * Syndopa" asks someone to subtract the improvement they have just reported
 * from a total before they can tell whether it describes their morning; "30
 * mins after the first improvement" is the gap they actually felt. The two
 * questions share a page, so the time being counted from is on screen while
 * this one is answered.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { buildQuestions } from '../src/screens/DoseLog/questions';
import type { DoseContext } from '../src/screens/DoseLog/questions';
import { EMPTY_DOSE, doseFloors } from '../src/types/doseLog';
import type { DoseDraft } from '../src/types/doseLog';
import type { TimeOfDay } from '../src/utils/date';

// The clock face pulls in SVG and a pan responder, and nothing here opens it.
jest.mock('../src/components/TimePicker', () => ({
  __esModule: true,
  default: () => null,
  TimeField: () => null,
}));

/** The question this suite is about - "how long to the peak effect?". */
const PEAK = 4;

const WOKE_AT: TimeOfDay = { hour: 7, minute: 0 };

/** Taken at 8, first felt better at 8:30 - so the peak counts from 8:30. */
const FELT_BETTER = dose({
  doseTime: { hour: 8, minute: 0 },
  whole: 1,
  firstEffect: { hour: 8, minute: 30 },
});

function dose(answers: Partial<DoseDraft> = {}): DoseDraft {
  return { ...EMPTY_DOSE, ...answers };
}

function context(draft: DoseDraft): DoseContext {
  return {
    dose: draft,
    doseNumber: 1,
    medicine: 'Syndopa',
    wakeTime: WOKE_AT,
    previous: null,
    floors: doseFloors(WOKE_AT, [draft], 0),
    insetX: 48,
    set: jest.fn(),
  };
}

/** Everything the peak question puts on screen, as one string. */
function peakText(draft: DoseDraft): string {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <>{buildQuestions(context(draft))[PEAK].body}</>,
    );
  });
  return JSON.stringify(renderer.toJSON());
}

describe('the suggestions on the peak question', () => {
  test('are counted from the first improvement, not from the dose', () => {
    const shown = peakText(FELT_BETTER);

    expect(shown).toContain('15 mins after the first improvement from Syndopa');
    expect(shown).not.toContain('after taking Syndopa');
  });

  /**
   * The half of it that would be easy to get right in words and wrong in
   * arithmetic: the sentence can name the first improvement while the clock
   * reading under it is still counted off the dose.
   *
   * The readings have to be ones only the right anchor reaches. The peak's
   * floor is the first improvement, so an offset counted off the dose that
   * lands before 8:30 is dropped from the grid anyway - which quietly hides
   * most of the difference between the two anchors. 9:15 is 8:30 + 45 and
   * nothing + an offset off 8:00; 8:30 is 8:00 + 30 and is not on the grid at
   * all once the count starts there.
   */
  test('land at the clock time that offset actually reaches', () => {
    const shown = peakText(FELT_BETTER);

    expect(shown).toContain('9:15 AM');
    expect(shown).not.toContain('8:30 AM');
  });

  /**
   * Both questions are on one page, so this one can be read before the one it
   * counts from has been answered. There is nothing to offer then, and the
   * question says so rather than offering suggestions measured off the dose.
   */
  test('are replaced by a line pointing up the page when Q4 is unanswered', () => {
    const shown = peakText(dose({ doseTime: { hour: 8, minute: 0 }, whole: 1 }));

    expect(shown).toContain('Once you answer the question above');
    expect(shown).not.toContain('after the first improvement from Syndopa');
  });
});
