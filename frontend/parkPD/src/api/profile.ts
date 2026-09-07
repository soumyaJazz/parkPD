import type {
  ProfileSetupRequest,
  ProfileUpdateRequest,
} from '../types/profile';
import { post, put } from './client';
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

/**
 * Saves the profile screen's changes.
 *
 * PUT, not POST: the screen sends every answer back, so this replaces the
 * profile rather than merging into it - which is what lets an answer the user
 * cleared actually clear.
 *
 * There is no matching fetch. The account is already held by the auth context
 * from launch, questionnaire and all, so the screen fills itself in from that
 * rather than asking again - and what comes back here replaces it.
 */
export function updateProfile(
  payload: ProfileUpdateRequest,
): Promise<ApiResult<ProfileResult>> {
  return put<ProfileResult>('/users/profile', payload);
}
