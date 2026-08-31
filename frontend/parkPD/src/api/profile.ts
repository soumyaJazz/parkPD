import type { ProfileSetupRequest } from '../types/profile';
import { post } from './client';
import type { ApiResult } from './client';
import type { AuthUser } from './auth';

/** What `POST /users/profile` hands back: the account with the details filled in. */
export type ProfileResult = {
  user: AuthUser;
};

/**
 * Saves the profile a new account is asked for right after sign-up.
 *
 * The body is passed through as built: the screen leaves `email`/`phone` out
 * whenever the account already carries them, and the server rejects an attempt
 * to change one that's already set, so a stale screen can't overwrite the
 * address the account was verified with.
 */
export function completeProfile(
  payload: ProfileSetupRequest,
): Promise<ApiResult<ProfileResult>> {
  return post<ProfileResult>('/users/profile', payload);
}
