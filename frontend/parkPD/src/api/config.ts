import { Platform } from 'react-native';

/**
 * Where the Nest server lives in development.
 *
 * `localhost` on an Android emulator points at the emulator itself, so it needs
 * the host-machine alias instead. iOS simulators and the web build both share
 * the host's loopback. Point this at a real host before shipping anywhere.
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${DEV_HOST}:8000`;

/** Long enough to cover a cold SMTP handshake, short enough to not look frozen. */
export const API_TIMEOUT_MS = 15000;
