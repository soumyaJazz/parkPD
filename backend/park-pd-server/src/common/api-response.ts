/**
 * The two shapes every endpoint answers in. The client never has to know which
 * route it called to find something it can put on screen: there is always a
 * `message`, on success and on failure alike.
 */

/** What a controller/service returns; the interceptor wraps it into the envelope. */
export interface ApiPayload<T> {
  /** Short, user-facing copy. No stack traces, no internal jargon. */
  message: string;
  data?: T;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T | null;
}

export interface ApiErrorResponse {
  success: false;
  /** Mirrors the HTTP status, so a client reading only the body still has it. */
  statusCode: number;
  message: string;
  /** Where the technical detail goes, so `message` can stay readable. */
  error: {
    code: string;
    details?: unknown;
  };
}

/** Narrows a handler's return value to something already carrying UI copy. */
export function isApiPayload(value: unknown): value is ApiPayload<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiPayload<unknown>).message === 'string'
  );
}
