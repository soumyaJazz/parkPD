/**
 * @format
 *
 * The suggestions fold away once the question is answered.
 *
 * Six full-width tiles are worth the room while they are the fast way in, and
 * are a screenful between the reader and the next question once they are not.
 * These cover the fold in both directions, and that nothing is lost by it.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import TimeAnswer from '../src/components/TimeAnswer';
import type { TimeFloor, TimeOfDay } from '../src/utils/date';

// The clock face pulls in SVG and a pan responder, and none of this suite
// opens it - every answer below is given from a suggestion tile.
jest.mock('../src/components/TimePicker', () => ({
  __esModule: true,
  default: () => null,
  TimeField: () => null,
}));

const ANCHOR: TimeOfDay = { hour: 8, minute: 0 };

const FLOOR: TimeFloor = {
  minutes: 8 * 60,
  time: ANCHOR,
  was: 'you took your 1st dose',
  after: 'after your 1st dose',
};

const OFFSETS = [15, 30, 60, 90] as const;

function render(props: Partial<React.ComponentProps<typeof TimeAnswer>> = {}) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <TimeAnswer
        value={null}
        onChange={jest.fn()}
        label="First improvement"
        pickerTitle="FIRST IMPROVEMENT"
        anchor={ANCHOR}
        anchorPhrase="after taking Syndopa"
        offsets={OFFSETS}
        noAnchorHint="Choose the time on the clock above."
        floor={FLOOR}
        {...props}
      />,
    );
  });
  return renderer;
}

function shows(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return JSON.stringify(renderer.toJSON()).includes(text);
}

/** Whatever carries this accessibility label and takes a press. */
function pressable(tree: ReactTestInstance, label: string) {
  return tree.findAll(
    node =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
}

function press(tree: ReactTestInstance, label: string) {
  const target = pressable(tree, label);
  if (!target) {
    throw new Error(`No pressable labelled "${label}"`);
  }
  ReactTestRenderer.act(() => {
    target.props.onPress();
  });
}

/** The 8:15 tile - 15 minutes after the 8:00 anchor. */
const FIRST_TILE = '15 mins after taking Syndopa, at 8:15 AM';

test('an unanswered question opens with the suggestions showing', () => {
  const renderer = render();

  expect(shows(renderer, '8:15 AM')).toBe(true);
  expect(shows(renderer, 'Hide suggested times')).toBe(true);
  expect(shows(renderer, 'Show suggested times')).toBe(false);
});

test('choosing a suggestion answers the question and folds them away', () => {
  const onChange = jest.fn();
  const renderer = render({ onChange });

  press(renderer.root, FIRST_TILE);

  expect(onChange).toHaveBeenCalledWith({ hour: 8, minute: 15 });

  // The component does not own the answer, so the parent hands it back - which
  // is what a real screen does, and what leaves the fold to be judged on.
  ReactTestRenderer.act(() => {
    renderer.update(
      <TimeAnswer
        value={{ hour: 8, minute: 15 }}
        onChange={onChange}
        label="First improvement"
        pickerTitle="FIRST IMPROVEMENT"
        anchor={ANCHOR}
        anchorPhrase="after taking Syndopa"
        offsets={OFFSETS}
        noAnchorHint="Choose the time on the clock above."
        floor={FLOOR}
      />,
    );
  });

  expect(shows(renderer, 'Show suggested times')).toBe(true);
  expect(pressable(renderer.root, FIRST_TILE)).toBeUndefined();
});

test('the toggle brings them back, and says so in words either way', () => {
  const renderer = render({ value: { hour: 8, minute: 15 } });

  // Opens folded, because the question arrives answered.
  expect(shows(renderer, 'Show suggested times')).toBe(true);
  expect(pressable(renderer.root, FIRST_TILE)).toBeUndefined();

  press(renderer.root, 'Show 4 suggested times');

  expect(shows(renderer, 'Hide suggested times')).toBe(true);
  expect(pressable(renderer.root, FIRST_TILE)).toBeDefined();

  press(renderer.root, 'Hide the suggested times');

  expect(shows(renderer, 'Show suggested times')).toBe(true);
});

/**
 * A time can stop being an answer without the user touching this question -
 * the day's chain clears one that a change further up has overtaken - and the
 * fast way in should be waiting rather than behind a tap nobody expects.
 */
test('an answer cleared from above puts the suggestions back', () => {
  const onChange = jest.fn();
  const props = {
    onChange,
    label: 'First improvement',
    pickerTitle: 'FIRST IMPROVEMENT',
    anchor: ANCHOR,
    anchorPhrase: 'after taking Syndopa',
    offsets: OFFSETS,
    noAnchorHint: 'Choose the time on the clock above.',
    floor: FLOOR,
  };

  const renderer = render({ ...props, value: { hour: 8, minute: 15 } });
  expect(shows(renderer, 'Show suggested times')).toBe(true);

  ReactTestRenderer.act(() => {
    renderer.update(<TimeAnswer {...props} value={null} />);
  });

  expect(shows(renderer, 'Hide suggested times')).toBe(true);
  expect(pressable(renderer.root, FIRST_TILE)).toBeDefined();
});

test('an escape answers the question too, so it folds them the same way', () => {
  const escape = {
    label: 'No motor improvement',
    tone: 'bad' as const,
    selected: false,
    onPress: jest.fn(),
  };
  const renderer = render({ escape });

  expect(shows(renderer, 'Hide suggested times')).toBe(true);

  ReactTestRenderer.act(() => {
    renderer.update(
      <TimeAnswer
        value={null}
        onChange={jest.fn()}
        label="First improvement"
        pickerTitle="FIRST IMPROVEMENT"
        anchor={ANCHOR}
        anchorPhrase="after taking Syndopa"
        offsets={OFFSETS}
        noAnchorHint="Choose the time on the clock above."
        floor={FLOOR}
        escape={{ ...escape, selected: true }}
      />,
    );
  });

  expect(shows(renderer, 'Show suggested times')).toBe(true);
});
