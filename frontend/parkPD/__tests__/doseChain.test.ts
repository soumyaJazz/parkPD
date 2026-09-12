/**
 * @format
 *
 * The order a day has to run in, and what happens when an answer breaks it.
 *
 * The hard part is not that later must come after earlier - it is that a clock
 * reading has no date on it, so "2 AM" after an 11 PM dose and "2 AM" instead
 * of one are the same two numbers. These cover both sides of that line.
 */

import {
  EMPTY_DOSE,
  clearedTimes,
  doseFloors,
  reconcileChain,
} from '../src/types/doseLog';
import type { DoseDraft } from '../src/types/doseLog';
import { isInOrder } from '../src/utils/date';
import type { TimeOfDay } from '../src/utils/date';

/** "7:30" as the clock reading the app stores. */
function at(hour: number, minute = 0): TimeOfDay {
  return { hour, minute };
}

function dose(answers: Partial<DoseDraft> = {}): DoseDraft {
  return { ...EMPTY_DOSE, ...answers };
}

const WOKE_AT_7 = at(7);

describe('a reading measured against the one before it', () => {
  test('later on the same clock face is always in order', () => {
    const sevenAM = 7 * 60;
    expect(isInOrder(at(7), sevenAM)).toBe(true);
    expect(isInOrder(at(7, 30), sevenAM)).toBe(true);
    // Fifteen hours later is a long day, not a wrong one.
    expect(isInOrder(at(22), sevenAM)).toBe(true);
  });

  test('the small hours after a late dose are in order', () => {
    const elevenPM = 23 * 60;
    expect(isInOrder(at(0, 30), elevenPM)).toBe(true);
    expect(isInOrder(at(2), elevenPM)).toBe(true);
    expect(isInOrder(at(5), elevenPM)).toBe(true);
  });

  test('a reading most of a day behind is not', () => {
    const sevenAM = 7 * 60;
    // The AM/PM slip this is here to catch: 6:30 after a 7 AM waking would
    // otherwise be read as 6:30 the next morning, twenty-three hours on.
    expect(isInOrder(at(6, 30), sevenAM)).toBe(false);
    expect(isInOrder(at(6, 55), sevenAM)).toBe(false);
    // And an evening floor with a morning reading, which is the same slip the
    // other way round.
    expect(isInOrder(at(9), 20 * 60)).toBe(false);
  });
});

describe('the floors one dose sits on', () => {
  test('the first dose is measured from waking up', () => {
    const floors = doseFloors(WOKE_AT_7, [dose()], 0);
    expect(floors.doseTime.time).toEqual(WOKE_AT_7);
    expect(floors.doseTime.was).toBe('you woke up');
  });

  test('each answer becomes the floor for the one after it', () => {
    const day = [
      dose({
        doseTime: at(7, 30),
        firstEffect: at(8),
        peakEffect: at(9),
        wearOff: at(13),
      }),
    ];
    const floors = doseFloors(WOKE_AT_7, day, 0);

    expect(floors.firstEffect.time).toEqual(at(7, 30));
    expect(floors.peakEffect.time).toEqual(at(8));
    expect(floors.wearOff.time).toEqual(at(9));
    expect(floors.end.time).toEqual(at(13));
  });

  test('the next dose starts from when the last one wore off', () => {
    const day = [
      dose({
        doseTime: at(7, 30),
        firstEffect: at(8),
        peakEffect: at(9),
        wearOff: at(13),
      }),
      dose(),
    ];
    expect(doseFloors(WOKE_AT_7, day, 1).doseTime.time).toEqual(at(13));
  });

  /**
   * The case the user asked for by name: a dose that never worked skips the
   * six questions after it, so the only thing it is known to have done is
   * happen - and that is what the dose after it has to come after.
   */
  test('a dose that never worked leaves only its own time behind', () => {
    const day = [dose({ doseTime: at(7, 30), noFirstEffect: true }), dose()];
    const next = doseFloors(WOKE_AT_7, day, 1).doseTime;
    expect(next.time).toEqual(at(7, 30));
    expect(next.was).toBe('you took your 1st dose');
  });

  test('an unanswered link falls back to the latest one there is', () => {
    const day = [
      dose({ doseTime: at(7, 30), firstEffect: at(8), noWearOff: true }),
      dose(),
    ];
    // No peak given and no wear-off at all, so the chain still stands at the
    // first improvement rather than at nothing.
    expect(doseFloors(WOKE_AT_7, day, 1).doseTime.time).toEqual(at(8));
  });
});

describe('putting the day back in order after an edit', () => {
  test('a chain that still fits is left alone', () => {
    const day = [
      dose({ doseTime: at(8), firstEffect: at(8, 30), peakEffect: at(9) }),
    ];
    expect(reconcileChain(WOKE_AT_7, day)).toEqual(day);
  });

  test('moving a dose later clears what it has overtaken', () => {
    const before = [
      dose({ doseTime: at(11), firstEffect: at(8, 30), peakEffect: at(9) }),
    ];
    const after = reconcileChain(WOKE_AT_7, before);

    expect(after[0].doseTime).toEqual(at(11));
    expect(after[0].firstEffect).toBeNull();
    expect(after[0].peakEffect).toBeNull();
    expect(clearedTimes(before, after)).toEqual([
      '1st dose — the first improvement',
      '1st dose — the peak effect',
    ]);
  });

  test('a later dose is cleared too when the one before it moves past it', () => {
    const before = [
      dose({ doseTime: at(8), firstEffect: at(8, 30), wearOff: at(16) }),
      dose({ doseTime: at(13) }),
    ];
    const after = reconcileChain(WOKE_AT_7, before);

    expect(after[1].doseTime).toBeNull();
    expect(clearedTimes(before, after)).toEqual(['2nd dose — the dose time']);
  });

  test('a day that runs past midnight survives it', () => {
    const before = [
      dose({
        doseTime: at(22, 30),
        firstEffect: at(23),
        peakEffect: at(23, 45),
        wearOff: at(3),
      }),
    ];
    const after = reconcileChain(WOKE_AT_7, before);

    expect(after).toEqual(before);
    expect(clearedTimes(before, after)).toEqual([]);
  });
});

/**
 * The five rules, each stated as the answer it refuses.
 *
 * Written against `isInOrder` and the floors together, which is exactly what
 * the question asks when someone picks a time - so a rule breaking here is a
 * rule the screen has stopped enforcing.
 */
describe('the order a day has to run in', () => {
  const refuses = (floors: { minutes: number }, time: TimeOfDay) =>
    !isInOrder(time, floors.minutes);

  test('a dose cannot be taken before waking up', () => {
    const floors = doseFloors(WOKE_AT_7, [dose()], 0);
    expect(refuses(floors.doseTime, at(6, 30))).toBe(true);
    expect(refuses(floors.doseTime, at(7))).toBe(false);
  });

  test('the first improvement cannot come before the dose', () => {
    const day = [dose({ doseTime: at(7, 30) })];
    const floors = doseFloors(WOKE_AT_7, day, 0);
    expect(refuses(floors.firstEffect, at(7, 15))).toBe(true);
    expect(refuses(floors.firstEffect, at(7, 30))).toBe(false);
  });

  test('the peak cannot come before the first improvement', () => {
    const day = [dose({ doseTime: at(7, 30), firstEffect: at(7, 45) })];
    const floors = doseFloors(WOKE_AT_7, day, 0);
    expect(refuses(floors.peakEffect, at(7, 40))).toBe(true);
    expect(refuses(floors.peakEffect, at(7, 45))).toBe(false);
  });

  test('the effect cannot wear off before it peaked', () => {
    const day = [
      dose({ doseTime: at(7, 30), firstEffect: at(7, 45), peakEffect: at(9) }),
    ];
    const floors = doseFloors(WOKE_AT_7, day, 0);
    expect(refuses(floors.wearOff, at(8, 30))).toBe(true);
    expect(refuses(floors.wearOff, at(12))).toBe(false);
  });

  test('the next dose cannot come before the last one wore off', () => {
    const day = [
      dose({
        doseTime: at(7, 30),
        firstEffect: at(7, 45),
        peakEffect: at(9),
        wearOff: at(13),
      }),
      dose(),
    ];
    const floors = doseFloors(WOKE_AT_7, day, 1);
    expect(refuses(floors.doseTime, at(12))).toBe(true);
    expect(refuses(floors.doseTime, at(13, 30))).toBe(false);
  });

  test('and cannot come before the last one was taken, when it never worked', () => {
    const day = [dose({ doseTime: at(13), noFirstEffect: true }), dose()];
    const floors = doseFloors(WOKE_AT_7, day, 1);
    expect(refuses(floors.doseTime, at(12))).toBe(true);
    expect(refuses(floors.doseTime, at(17))).toBe(false);
  });
});
