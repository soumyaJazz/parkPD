import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { clearSession, getSession, saveSession } from './tokenStorage';
import type { StoredSession } from './tokenStorage';

/** A failure the server described, as opposed to one where it never answered. */
export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;

  /**
   * The server's machine-readable discriminator, from `error.details.reason`,
   * for the cases where one status covers outcomes a screen has to handle
   * differently. Absent on most failures - branch on it only where the server
   * is known to send it, and treat missing as "no special handling".
   */
  readonly reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reason = reason;
  }
}

/**
 * The server's error envelope. `message` is always a single user-facing string;
 * the array case covers a server that predates the envelope, where the
 * ValidationPipe's per-field messages came through raw.
 */
type ErrorBody = {
  message?: string | string[];
  error?: { code?: string; details?: unknown };
};

/** The server's success envelope. */
type SuccessBody<T> = { message?: string; data?: T | null };

/**
 * A successful response, split into the line to show the user and the payload
 * to act on. Every endpoint sends a `message`, so callers never have to invent
 * copy for something the server already worded.
 */
export type ApiResult<T> = {
  message: string;
  data: T;
};

/** Reads `error.details.reason`, which most failures simply don't carry. */
function readErrorReason(body: ErrorBody | null): string | undefined {
  const details = body?.error?.details as { reason?: unknown } | undefined;
  return typeof details?.reason === 'string' ? details.reason : undefined;
}

function readErrorMessage(body: ErrorBody | null, status: number): string {
  const raw = Array.isArray(body?.message) ? body.message[0] : body?.message;

  // The server rewrites the throttler guard's own message, which names its
  // exception class - this is the guard against one that slips through.
  if (status === 429 && (!raw || raw.startsWith('ThrottlerException'))) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  return raw || 'Something went wrong. Please try again.';
}

/* ------------------------------------------------------------------ *
 * Session ended
 * ------------------------------------------------------------------ */

type SessionEndedListener = () => void;

const sessionEndedListeners = new Set<SessionEndedListener>();

/**
 * Fires when a stored session turns out to be unusable and has been cleared -
 * a refresh the server refused, because the token was spent, expired, or
 * revoked by a logout on another device.
 *
 * Something has to tell the rest of the app, or every screen discovers it
 * separately on its own next 401. Returns its own unsubscribe.
 */
export function onSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => {
    sessionEndedListeners.delete(listener);
  };
}

async function endSession(): Promise<void> {
  await clearSession();
  sessionEndedListeners.forEach(listener => {
    listener();
  });
}

/* ------------------------------------------------------------------ *
 * Refresh
 * ------------------------------------------------------------------ */

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Trades the stored refresh token for a fresh pair, at most once at a time.
 *
 * The single-flight guard is correctness, not economy. The server rotates -
 * it deletes the refresh token in the act of spending it - so two refreshes
 * racing means the second one sends a token that no longer exists, and signs
 * the user out in the middle of their session. Every caller waits on the one
 * promise, and the winner's new tokens are what they all go on to use.
 */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  const session = getSession();
  if (!session) {
    return false;
  }

  // a bare fetch rather than request(): going back through the retry path
  // would turn one refused refresh into an endless loop of refreshes
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    // the network is down, not the session. Leaving the tokens in place means
    // the request that failed can simply be tried again once there's signal.
    return false;
  }

  if (!response.ok) {
    // the server refused it: spent, expired, or revoked elsewhere. Nothing
    // stored is worth keeping, and the user has to sign in again.
    await endSession();
    return false;
  }

  const payload = (await response.json().catch(() => null)) as
    | SuccessBody<StoredSession>
    | null;
  const data = payload?.data;

  // a 200 whose body isn't the shape we expect is not a session
  if (!data?.accessToken || !data?.refreshToken) {
    await endSession();
    return false;
  }

  await saveSession({
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });
  return true;
}

/* ------------------------------------------------------------------ *
 * Requests
 * ------------------------------------------------------------------ */

/**
 * The refresh call refreshes itself, and logout is the one request whose whole
 * point is to spend the refresh token - retrying either would fight the thing
 * it is trying to do.
 */
const NEVER_RETRIED = ['/auth/refresh', '/auth/logout'];

type RequestInit = {
  method: 'GET' | 'POST';
  body?: unknown;
};

async function request<T>(
  path: string,
  init: RequestInit,
  isRetry = false,
): Promise<ApiResult<T>> {
  // fetch has no timeout of its own, so a server that accepts the connection
  // and then stalls would leave the button spinning forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const headers: Record<string, string> = {};
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // read per attempt, not once per call: a retry after a refresh has to pick
  // up the token that refresh just wrote, not the stale one that got the 401
  const session = getSession();
  if (session) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      headers,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: controller.signal,
    });
  } catch (error) {
    // fetch only rejects when the exchange never completed - server down, no
    // network, or the abort above. A 4xx/5xx resolves and is handled below.
    const aborted = (error as Error)?.name === 'AbortError';
    throw new ApiError(
      aborted
        ? 'The server took too long to respond. Please try again.'
        : 'Could not reach the server. Check your connection and try again.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }

  // The access token only lasts 15 minutes, so this is the ordinary path
  // rather than an exceptional one: refresh, then send the original request
  // again. `isRetry` is what stops a server that 401s everything from looping,
  // and the session check keeps a signed-out 401 from trying at all.
  if (
    response.status === 401 &&
    !isRetry &&
    session !== null &&
    !NEVER_RETRIED.includes(path)
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  // An empty body and a proxy's HTML error page both fail to parse; either way
  // there is nothing to read, and the status still tells us what happened.
  const payload = (await response.json().catch(() => null)) as
    | (ErrorBody & SuccessBody<T>)
    | null;

  if (!response.ok) {
    throw new ApiError(
      readErrorMessage(payload, response.status),
      response.status,
      readErrorReason(payload),
    );
  }

  return {
    message: payload?.message ?? 'Done.',
    data: (payload?.data ?? null) as T,
  };
}

/** POSTs JSON and resolves with the unwrapped envelope, or throws an ApiError. */
export function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: 'POST', body });
}

/** GETs and resolves with the unwrapped envelope, or throws an ApiError. */
export function get<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: 'GET' });
}
