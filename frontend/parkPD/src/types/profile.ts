import type { QuestionnaireAnswers } from './questionnaire';

/** How the user describes themselves, matching the server's stored values. */
export type Gender = 'male' | 'female';

/**
 * The details the first half of setup collects.
 *
 * Age and date of birth are two views of one value on screen, but only one of
 * them travels: `dob`, as `DD/MM/YYYY`. The server never sees the age the user
 * may have typed, so the two can't arrive disagreeing.
 *
 * `email` and `phone` are absent whenever the account already carries that
 * detail from sign-up - those are shown locked rather than sent back unchanged.
 *
 * Which account is being filled in is deliberately not here: the server reads
 * it off the access token, so it is the one thing about this request the client
 * cannot choose. Sending it would now be rejected outright.
 */
export type ProfileDetails = {
  full_name: string;
  gender: Gender;
  /** DD/MM/YYYY. */
  dob: string;
  email?: string;
  phone?: string;
};

/**
 * The whole of setup in one request. Both halves are sent together at the end
 * of the questionnaire: the server completes a profile exactly once, so there
 * is no half-saved state for an abandoned run to leave behind.
 */
export type ProfileSetupRequest = ProfileDetails & QuestionnaireAnswers;
