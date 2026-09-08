import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { fetchMe, logout, onSessionEnded } from '../api';
import type { AuthUser, VerifiedSession } from '../api';
import {
  clearSession,
  getSession,
  loadSession,
  saveSession,
} from '../api/tokenStorage';
import { showToast } from '../components/Toast';

type AuthContextValue = {
  /** The signed-in account, or null when nobody is. */
  user: AuthUser | null;
  /**
   * True until the session saved on the device has been checked against the
   * server. The navigator waits on this rather than flashing the sign-in screen
   * at someone who is already signed in.
   */
  isRestoring: boolean;
  /** Holds a session the OTP screen just earned. */
  signIn: (session: VerifiedSession) => Promise<void>;
  /** Ends it, on the server and on the device. */
  signOut: () => Promise<void>;
  /**
   * Replaces the held account. Profile setup saves a new version of the user,
   * and handing it back here is what moves the app past setup.
   */
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // At launch: is there a session on this device, and does the server still
  // honour it? Runs once, and every path out of it clears isRestoring.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = await loadSession();

      // Nothing saved, or the refresh token is past saving - either way there
      // is no round trip worth making, and the answer is the sign-in screen.
      if (!stored || stored.refreshTokenExpiresAt <= Date.now()) {
        if (stored) {
          await clearSession();
        }
        if (!cancelled) {
          setIsRestoring(false);
        }
        return;
      }

      try {
        // Through the api client, so an access token that lapsed while the app
        // was closed is refreshed and retried rather than read as signed out.
        const { data } = await fetchMe();
        if (!cancelled) {
          setUser(data);
        }
      } catch {
        // The client has already cleared the tokens if the server refused
        // them; there is nothing to show but the sign-in screen.
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    };

    restore();

    return () => {
      cancelled = true;
    };
  }, []);

  // The api client clears the tokens whenever a refresh is refused - because
  // it was spent, expired, or revoked by a logout on another device. This is
  // how the app finds out, instead of every screen discovering it on its own
  // next failed request.
  useEffect(
    () =>
      onSessionEnded(() => {
        setUser(null);
        showToast(
          'You have been signed out',
          'Your session ended for your security. Please sign in again.',
        );
      }),
    [],
  );

  const signIn = useCallback(async (session: VerifiedSession) => {
    // stored before the user is set: the navigator swaps stacks the moment a
    // user exists, and the first screen it mounts will already be making
    // requests that need the token to be on disk
    await saveSession({
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    });
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    const stored = getSession();

    // Best effort. The stored row is what makes a session revivable, so it is
    // worth asking the server to drop it - but being offline must not leave
    // someone unable to sign out of their own device.
    if (stored) {
      try {
        await logout(stored.refreshToken);
      } catch {
        // already gone, or no connection - the local clear below still stands
      }
    }

    await clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isRestoring, signIn, signOut, updateUser }),
    [user, isRestoring, signIn, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
