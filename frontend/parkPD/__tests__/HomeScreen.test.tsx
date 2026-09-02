/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import HomeScreen from '../src/screens/Home';
import { useAuth } from '../src/context/AuthContext';

type HomeProps = React.ComponentProps<typeof HomeScreen>;

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

/** Whatever carries this accessibility label and takes a press, if anything. */
function findPressable(tree: ReactTestInstance, label: string) {
  return tree.findAll(
    node =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
}

/** Presses it, the way a user would. */
function press(tree: ReactTestInstance, label: string) {
  const target = findPressable(tree, label);
  if (!target) {
    throw new Error(`No pressable labelled "${label}"`);
  }
  return ReactTestRenderer.act(() => target.props.onPress());
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
});

async function render() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
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
      findPressable(renderer.root, 'Tuesday, August 25, 2026, not yet available'),
    ).toBeUndefined();
  });

  test('the month arrows roll the year over at January', async () => {
    const renderer = await render();

    for (let step = 0; step < 8; step++) {
      await press(renderer.root, 'Previous month');
    }

    expect(shows(renderer, 'December 2025')).toBe(true);
  });
});
