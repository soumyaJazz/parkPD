/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import HomeScreen from '../src/screens/Home';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

/** Presses whatever carries this accessibility label, the way a user would. */
function press(tree: ReactTestInstance, label: string) {
  const target = tree.findAll(
    node =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
  if (!target) {
    throw new Error(`No pressable labelled "${label}"`);
  }
  return ReactTestRenderer.act(() => target.props.onPress());
}

test('the sign-out button confirms, then ends the session', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  mockedUseAuth.mockReturnValue({
    user: { id: '1', email: 'a@b.com', createdAt: '', fullName: 'Ann' },
    isRestoring: false,
    signIn: jest.fn(),
    signOut,
    updateUser: jest.fn(),
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<HomeScreen />);
  });

  // The confirmation is drawn by the app, so it is reachable here - and on web,
  // where Alert.alert is an empty function and this press led nowhere.
  await press(renderer.root, 'Sign out of parkPD');
  expect(signOut).not.toHaveBeenCalled();

  await press(renderer.root, 'Sign out');
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('backing out of the confirmation keeps the session', async () => {
  const signOut = jest.fn().mockResolvedValue(undefined);
  mockedUseAuth.mockReturnValue({
    user: { id: '1', email: 'a@b.com', createdAt: '' },
    isRestoring: false,
    signIn: jest.fn(),
    signOut,
    updateUser: jest.fn(),
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<HomeScreen />);
  });

  await press(renderer.root, 'Sign out of parkPD');
  await press(renderer.root, 'Stay signed in');
  expect(signOut).not.toHaveBeenCalled();
});
