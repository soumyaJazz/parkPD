import * as crypto from 'crypto';
import { normalizePhone } from '../users/users.service';

/**
 * How the auth routes are counted, when counting by IP address is wrong.
 *
 * The app is a phone app, and mobile carriers put very large numbers of
 * subscribers behind a small pool of public addresses - carrier-grade NAT. So
 * "requests from this IP" on a phone network is closer to "requests from this
 * city" than "requests from this person", and a limit tight enough to be worth
 * having is tight enough to lock out strangers who share a carrier. The people
 * this app is for would see "too many requests" having done nothing at all.
 *
 * The fix is to count the thing the limit is actually about - this contact,
 * this challenge, this device - which no amount of address sharing affects.
 *
 * What these must not do is *replace* the address limit. Every value below is
 * read from the request body, so a caller can hand over a different one each
 * time and appear to be someone new. Counting by contact alone would mean one
 * host could ask for codes to ten thousand different addresses unimpeded. So
 * these run as a second, independent limit alongside the per-address one, and
 * a request has to satisfy both - see `app.module.ts`.
 */

/**
 * Hashed rather than stored plainly.
 *
 * These become keys in the throttler's store, and the raw values are a person's
 * email address, their phone number, or a live refresh token. A rate limiter is
 * no place for any of those to sit in memory, and a fixed-length digest counts
 * exactly as well as the original does.
 */
function key(prefix: string, value: string): string {
  const digest = crypto.createHash('sha256').update(value).digest('hex');
  return `${prefix}:${digest.slice(0, 32)}`;
}

/**
 * Falls back to the address when the body is not what we expected.
 *
 * Guards run before the validation pipe, so nothing here can assume the body
 * has been checked - it is whatever JSON the caller sent. A missing or
 * malformed field is a request that is about to be rejected as a 400 anyway;
 * counting it by address until then is the safe direction to fail.
 */
function fallback(req: Record<string, unknown>): string {
  return `ip:${typeof req.ip === 'string' ? req.ip : 'unknown'}`;
}

function body(req: Record<string, unknown>): Record<string, unknown> {
  const value = req.body;
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * `/auth/request-otp`, counted per destination.
 *
 * Normalised the same way `AuthService.normalizeContact` does it, so that
 * `Sam@Example.com`, `sam@example.com` and `  sam@example.com ` are one bucket
 * rather than three. A limit that a change of capitalisation gets past is not a
 * limit.
 */
export function byContact(req: Record<string, unknown>): string {
  const { contact, method } = body(req);
  if (typeof contact !== 'string' || contact.length === 0) {
    return fallback(req);
  }

  const normalized =
    method === 'phone' ? normalizePhone(contact) : contact.trim().toLowerCase();

  return key('contact', normalized);
}

/**
 * `/auth/verify-otp`, counted per challenge.
 *
 * This is the guessing limit, and a guess is always aimed at one challenge. The
 * database is the real cap - `OTP_MAX_ATTEMPTS` is counted on the row itself and
 * cannot be outrun - so this only has to stop a burst arriving faster than that
 * counter is written, which is a per-challenge question.
 */
export function byChallenge(req: Record<string, unknown>): string {
  const { challengeId } = body(req);
  if (typeof challengeId !== 'string' || challengeId.length === 0) {
    return fallback(req);
  }
  return key('challenge', challengeId);
}

/**
 * `/auth/refresh`, counted per token - which in practice is per device.
 *
 * A refresh token belongs to one signed-in device, so this gives every phone
 * its own allowance. Without it, a household or an office on one address share
 * a single refresh budget, and the app that happens to wake up last is the one
 * signed out.
 */
export function byRefreshToken(req: Record<string, unknown>): string {
  const { refreshToken } = body(req);
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return fallback(req);
  }
  return key('refresh', refreshToken);
}
