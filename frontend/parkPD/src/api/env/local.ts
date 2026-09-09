import { Platform } from 'react-native';
import type { ApiEnvironment } from './types';

/**
 * Where the Nest server lives when it is running on this machine.
 *
 * `localhost` on an Android emulator points at the emulator itself, so it needs
 * the host-machine alias instead. iOS simulators and the web build both share
 * the host's loopback. Neither of them reaches a *physical* device: a phone on
 * the same Wi-Fi needs this machine's LAN address here instead.
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

/**
 * Plain HTTP, which Android only permits because debug builds set
 * `usesCleartextTraffic="true"`. A *release* build merges that to false, so
 * this environment is deliberately not wired to any `build:apk` script.
 */
export const environment: ApiEnvironment = {
  name: 'local',
  apiBaseUrl: `http://${DEV_HOST}:8000`,
};
