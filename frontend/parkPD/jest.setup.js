/**
 * AsyncStorage is a native module, so under Jest there is nothing for it to
 * bind to and importing it throws. The package ships an in-memory stand-in for
 * exactly this - used rather than a hand-rolled stub so the mock keeps pace
 * with the real API.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
