import { API_BASE_URL, API_TIMEOUT_MS } from './config';

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

/** POSTs JSON and resolves with the unwrapped envelope, or throws an ApiError. */
export async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  // fetch has no timeout of its own, so a server that accepts the connection
  // and then stalls would leave the button spinning forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
