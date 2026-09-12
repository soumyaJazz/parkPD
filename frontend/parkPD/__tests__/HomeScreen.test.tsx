/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import HomeScreen from '../src/screens/Home';
import { fetchDayStatuses } from '../src/api';
import { useAuth } from '../src/context/AuthContext';

type HomeProps = React.ComponentProps<typeof HomeScreen>;

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * `useFocusEffect` reaches for a navigator above it, and this suite renders the
 * screen on its own - see the note on `navigate` below. Running the effect on
 * mount is what focus amounts to for a screen that is the only thing mounted.
 */
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      useEffect(effect, [effect]),
  };
});

/** Which days carry a log now comes from the server, so the server is stubbed. */
jest.mock('../src/api', () => ({ fetchDayStatuses: jest.fn() }));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedFetchDayStatuses = fetchDayStatuses as jest.MockedFunction<
  typeof fetchDayStatuses
>;

/**
 * The four days behind the fixed Monday below, as the server would send them.
 *
 * `in-progress` is stubbed even though the server only ever answers `logged`
 * today: the footer has a different thing to say about a part-filled day, and
 * that is the screen behaviour under test here.
 */
const AUGUST_STATUSES = {
  '2026-08-23': 'logged',
  '2026-08-22': 'logged',
  '2026-08-21': 'in-progress',
  '2026-08-20': 'logged',
} as const;

/** Whatever carries this accessibility label and takes a press, if anything. */
function findPressable(tree: ReactTestInstance, label: string) {
  return tree.findAll(
    node =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
}

/**
 * Presses it, the way a user would, and lets whatever it set off settle.
 *
 * Async because a press can change the month, and a new month asks the server
 * for its days - so a synchronous act would return while that answer was still
 * in flight and leave the update landing outside it.
 */
function press(tree: ReactTestInstance, label: string) {
  const target = findPressable(tree, label);
  if (!target) {
    throw new Error(`No pressable labelled "${label}"`);
  }
  return ReactTestRenderer.act(async () => {
    await target.props.onPress();
  });
}

function shows(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return JSON.stringify(renderer.toJSON()).includes(text);
}

function signedIn(overrides: Record<string, unknown> = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: '1', email: 'a@b.com', created_at: '', full_name: 'Ann' },
    isRestoring: false,
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    updateUser: jest.fn(),
    ...overrides,
  });
}

/**
 * The screen navigates on "Log Day", so it needs a navigator. Only the two
 * calls it makes are stubbed - the rest of the prop is never reached, and
 * standing a whole navigation container up here would be testing React
 * Navigation rather than this screen.
 */
const navigate = jest.fn();

beforeEach(() => {
  navigate.mockClear();
  mockedFetchDayStatuses.mockReset();
  mockedFetchDayStatuses.mockResolvedValue({
    message: 'You have logged 4 days in this period.',
    data: { statuses: { ...AUGUST_STATUSES } },
  });
});

async function render() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  // An async callback, so that the day statuses the screen asks for on mount
  // have settled by the time this returns - otherwise every test would be
  // asserting against a calendar that is still loading.
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HomeScreen
        navigation={{ navigate } as unknown as HomeProps['navigation']}
        route={{ key: 'Home', name: 'Home' } as HomeProps['route']}
      />,
    );
  });
  return renderer;
}

test('the sign-out button confirms, then ends the session', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  signedIn({ signOut });

  const renderer = await render();

  // Sign out lives behind the header menu, so it takes a press to reach.
  await press(renderer.root, 'Open menu');
  await press(renderer.root, 'Sign out of parkPD');
  expect(signOut).not.toHaveBeenCalled();

  // The confirmation is drawn by the app, so it is reachable here - and on web,
  // where Alert.alert is an empty function and this press led nowhere.
  await press(renderer.root, 'Sign out');
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('backing out of the confirmation keeps the session', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  signedIn({ signOut });

  const renderer = await render();

  await press(renderer.root, 'Open menu');
  await press(renderer.root, 'Sign out of parkPD');
  await press(renderer.root, 'Stay signed in');
  expect(signOut).not.toHaveBeenCalled();
});

describe('the calendar, on a fixed Monday morning', () => {
  // 24 August 2026, 09:00 - so "today" is a Monday with four days of history
  // behind it and the rest of the month still ahead.
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 7, 24, 9, 0, 0) });
    signedIn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('greets by the hour and waits for a date to be picked', async () => {
    const renderer = await render();

    expect(shows(renderer, 'Good Morning')).toBe(true);
    expect(shows(renderer, 'Ann')).toBe(true);
    expect(shows(renderer, 'August 2026')).toBe(true);
    expect(shows(renderer, 'Tap a date above to start logging')).toBe(true);
    expect(shows(renderer, 'Log Day')).toBe(false);
  });

  test('picking a past day offers to log it', async () => {
    const renderer = await render();

    await press(renderer.root, 'Sunday, August 23, 2026, logged');

    expect(shows(renderer, 'Sun, Aug 23')).toBe(true);
    expect(shows(renderer, 'Selected date')).toBe(true);
    expect(shows(renderer, 'Log Day')).toBe(true);
  });

  test('logging the picked day opens the morning check for it', async () => {
    const renderer = await render();

    await press(renderer.root, 'Sunday, August 23, 2026, logged');
    await press(renderer.root, 'Log day, Sunday, August 23, 2026');

    // The day travels as its key, not as a Date - route params are serialised.
    expect(navigate).toHaveBeenCalledWith('MorningCheck', {
      date: '2026-08-23',
    });
  });

  test('a half-finished day offers to be resumed instead', async () => {
    const renderer = await render();

    await press(renderer.root, 'Friday, August 21, 2026, in progress');

    expect(shows(renderer, 'Resume logging')).toBe(true);
  });

  test('days that have not happened take no press', async () => {
    const renderer = await render();

    expect(
      findPressable(
        renderer.root,
        'Tuesday, August 25, 2026, not yet available',
      ),
    ).toBeUndefined();
  });

  /**
   * A day still being lived cannot answer when its doses wore off or how the
   * night went, so the log stops at yesterday - and the reason is on screen,
   * because a date that quietly ignores a tap is the worst way to say it.
   */
  test('today takes no press either, and the screen says why', async () => {
    const renderer = await render();

    const label =
      'Monday, August 24, 2026, today, you can log today from tomorrow';

    // Drawn and named - so the assertion below is about the press being gone,
    // not about the label having been spelled differently.
    expect(shows(renderer, label)).toBe(true);
    expect(findPressable(renderer.root, label)).toBeUndefined();
    expect(shows(renderer, 'You can log any day up to yesterday')).toBe(true);
  });

  test('yesterday is still the day nearest to hand', async () => {
    const renderer = await render();

    await press(renderer.root, 'Sunday, August 23, 2026, logged');

    expect(shows(renderer, 'Sun, Aug 23')).toBe(true);
    expect(shows(renderer, 'Log Day')).toBe(true);
  });

  test('the month arrows roll the year over at January', async () => {
    const renderer = await render();

    for (let step = 0; step < 8; step++) {
      await press(renderer.root, 'Previous month');
    }

    expect(shows(renderer, 'December 2025')).toBe(true);
  });

  test('each month asked for is the month on screen', async () => {
    const renderer = await render();

    expect(mockedFetchDayStatuses).toHaveBeenLastCalledWith(
      '2026-08-01',
      '2026-08-31',
    );

    // February is the month that catches an off-by-one on the last day.
    for (let step = 0; step < 6; step++) {
      await press(renderer.root, 'Previous month');
    }

    expect(mockedFetchDayStatuses).toHaveBeenLastCalledWith(
      '2026-02-01',
      '2026-02-28',
    );
  });

  /**
   * A calendar with no marks looks exactly like a calendar for someone who has
   * never logged a day, so a failure has to say so in words - and has to offer
   * the way out, since there is nothing else on this screen that retries it.
   */
  test('a server that cannot be reached says so, and can be asked again', async () => {
    mockedFetchDayStatuses.mockRejectedValueOnce(
      new Error('Could not reach the server.'),
    );

    const renderer = await render();

    expect(shows(renderer, 'Could not reach the server.')).toBe(true);
    expect(mockedFetchDayStatuses).toHaveBeenCalledTimes(1);

    await press(renderer.root, 'Try loading your logged days again');

    expect(mockedFetchDayStatuses).toHaveBeenCalledTimes(2);
    expect(shows(renderer, 'Could not reach the server.')).toBe(false);
    expect(shows(renderer, 'Sunday, August 23, 2026, logged')).toBe(true);
  });
});
