import type { AuthFlow, AuthMethod } from '../types/auth';
import type { Gender } from '../types/profile';
import { ApiError, get, post } from './client';
import type { ApiResult } from './client';

/**
 * What `POST /auth/request-otp` hands back. The code itself never leaves the
 * server - the challengeId is what ties the code the user types to the address
 * it was mailed to.
 */
export type OtpChallenge = {
  challengeId: string;
  /** Epoch milliseconds; the code stops working after this. */
  expiresAt: number;
  /**
   * Epoch milliseconds. The server refuses another code before this, so the
   * resend countdown reads it rather than keeping a duplicate of the cooldown.
   */
  resendAfter: number;
};

/**
 * Asks the server to send a one-time code.
 *
 * `purpose` is what lets the server reject a signup for an address that already
 * has an account (and a login for one that doesn't) before any mail goes out,
 * so the user finds out now rather than after typing a code.
 *
 * `method` is the tab the user picked; the server names it back in the
 * confirmation ("sent to your email address"), so that copy is written once,
 * on the side that knows where the code actually went.
 */
export function requestOtp(
  email: string,
  purpose: AuthFlow,
  method: AuthMethod = 'email',
): Promise<ApiResult<OtpChallenge>> {
  return post<OtpChallenge>('/auth/request-otp', {
    // the server lowercases too, but matching here keeps what we send equal to
    // what the account is stored under
    email: email.trim().toLowerCase(),
    purpose,
    method,
  });
}

/** The account a verified code belongs to. Mirrors the server's user row. */
export type AuthUser = {
  id: string;
  email: string;
  created_at: string;
  // Everything below is filled in by profile setup, which runs once straight
  // after sign-up - so an account exists without them for the minute in
  // between, and older rows on the server never had them at all.
  full_name?: string;
  phone?: string;
  gender?: Gender;
  /** DD/MM/YYYY - the single field the profile form sends. */
  dob?: string;
  /**
   * Set once, when setup is saved. Absent means the form is still owed, which
   * is what the navigator reads to decide where a signed-in user lands. It
   * comes from the server rather than being remembered on the device, so a
   * setup abandoned half way is still owed after a reinstall.
   */
  profile_completed_at?: string;
};

/**
 * What `POST /auth/verify-otp` hands back once the code checks out.
 *
 * Two tokens, two jobs. The access token is short-lived and travels on every
 * request; the refresh token is long-lived, is spent only to mint a new access
 * token, and is the half the server can actually revoke.
 */
export type VerifiedSession = {
  user: AuthUser;
  /** True when this verification is what created the account. */
  isNewUser: boolean;
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /** Epoch milliseconds. */
  refreshTokenExpiresAt: number;
};

/**
 * Spends a one-time code. The challenge is single-use on the server, so a
 * second call with the same id fails even when the code was right - callers
 * get one attempt per success.
 *
 * `purpose` has to match the flow the challenge was issued for; the server
 * rejects a code mailed for signup that is spent on a login, so a stale screen
 * can't cross the two.
 */
export function verifyOtp(
  challengeId: string,
  otp: string,
  purpose: AuthFlow,
): Promise<ApiResult<VerifiedSession>> {
  return post<VerifiedSession>('/auth/verify-otp', {
    challengeId,
    otp,
    purpose,
  });
}

/**
 * Why the server turned a code down, mirroring its own `VerifyFailureReason`.
 * All five come back as a 401, so this is what separates them.
 */
export type VerifyFailureReason =
  | 'wrong'
  | 'expired'
  | 'not-found'
  | 'locked'
  | 'purpose-mismatch';

/**
 * The reasons that leave nothing on the OTP screen worth trying: the challenge
 * is gone server-side, so no code typed against it can be accepted and only a
 * freshly requested one gets past.
 *
 * `wrong` is deliberately absent - that one is retried in place. Listed rather
 * than derived as "anything but wrong" so a reason added later doesn't start
 * throwing users off the screen before anyone has decided it should.
 */
const DEAD_CHALLENGE_REASONS: VerifyFailureReason[] = [
  'expired',
  'not-found',
  'locked',
  'purpose-mismatch',
];

/** True when the failure means the code is unusable, not merely mistyped. */
export function isDeadChallenge(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    DEAD_CHALLENGE_REASONS.includes(error.reason as VerifyFailureReason)
  );
}

/**
 * The account behind the stored token.
 *
 * Called once at launch to find out whether a saved session is still good. The
 * request goes through the api client, so an access token that lapsed while the
 * app was closed is refreshed and retried here - reaching a result at all is
 * the answer, and a throw means the session is gone.
 */
export function fetchMe(): Promise<ApiResult<AuthUser>> {
  return get<AuthUser>('/auth/me');
}

/**
 * Ends the session on the server by deleting the refresh token's row, so it can
 * never be traded for a new access token again.
 *
 * The access token it was paired with keeps working until it expires - up to 15
 * minutes - which is why the app clears its own copy rather than treating this
 * call as the whole of signing out.
 */
export function logout(refreshToken: string): Promise<ApiResult<null>> {
  return post<null>('/auth/logout', { refreshToken });
}
