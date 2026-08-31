import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where the session lives between app launches.
 *
 * AsyncStorage is not encrypted - on a rooted or jailbroken device this file is
 * readable. That is an accepted trade for now: the access token is worth 15
 * minutes, and losing the refresh token costs the user a new code rather than
 * their account. Before this app touches payments the refresh token belongs in
 * react-native-keychain, which uses the iOS Keychain and Android Keystore.
 * Everything here goes through one module so that swap is a single-file change.
 */

/**
 * Both halves of a signed-in session, as the server handed them over.
 *
 * The two deadlines are kept because the client acts on them: the refresh
 * deadline is what lets launch tell a session that is beyond saving from one
 * worth a round trip, without making the round trip to find out.
 */
export type StoredSession = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
};

const KEY = 'parkpd.session.v1';

/**
 * A mirror of what is on disk.
 *
 * Every outgoing request needs the access token, and AsyncStorage is async -
 * without this, attaching a header would mean awaiting the disk on every single
 * call. `loadSession()` fills it once at launch; nothing else on the request
 * path reads storage.
 */
let cached: StoredSession | null = null;

/** Reads the stored session into memory. Call once, at startup. */
export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    // unreadable or hand-edited - treat it as signed out rather than failing
    // the launch. The worst case is one extra sign-in.
    cached = null;
  }
  return cached;
}

/** The session as last read or written. Synchronous, for the request path. */
export function getSession(): StoredSession | null {
  return cached;
}

export async function saveSession(session: StoredSession): Promise<void> {
  // memory first: a write that fails still leaves this run signed in, and the
  // request path only ever reads the cache
  cached = session;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // the session works until the app is closed; it just won't survive that
  }
}

export async function clearSession(): Promise<void> {
  cached = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // already gone from the cache, which is what decides whether requests
    // carry a token
  }
}
