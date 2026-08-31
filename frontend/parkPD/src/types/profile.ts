/** How the user describes themselves, matching the server's stored values. */
export type Gender = 'male' | 'female';

/**
 * The profile form's request body.
 *
 * Age and date of birth are two views of one value on screen, but only one of
 * them travels: `dob`, as `DD/MM/YYYY`. The server never sees the age the user
 * may have typed, so the two can't arrive disagreeing.
 *
 * `email` and `phone` are absent whenever the account already carries that
 * detail from sign-up - those are shown locked rather than sent back unchanged.
 */
export type ProfileSetupRequest = {
  userId: string;
  fullName: string;
  gender: Gender;
  /** DD/MM/YYYY. */
  dob: string;
  email?: string;
  phone?: string;
};
