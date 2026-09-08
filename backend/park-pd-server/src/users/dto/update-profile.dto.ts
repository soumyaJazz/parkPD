import { IsEmail, IsOptional, Matches } from 'class-validator';
import { ProfileAnswersDto } from './profile-answers.dto';

/**
 * The body of `PUT /users/profile` - the same form, reopened.
 *
 * Both contact details are here, and exactly one of them will be refused: the
 * one a code was actually delivered to is what the account is, and moving it
 * would hand the account to a destination nobody has proved they can read.
 * Which one that is comes off the row, not off this request - see
 * `verifiedWith` - so the client cannot nominate itself a different answer.
 *
 * PUT rather than PATCH because the screen sends the whole form back every
 * time: every answer below is required, so this replaces the profile rather
 * than merging into it, and an answer left out is a client bug rather than a
 * field to leave alone. The two details here are the exception - see the note
 * on each - because the screen never sends back the one it is showing locked.
 */
export class UpdateProfileDto extends ProfileAnswersDto {
  /**
   * An address, or null to remove the one on file. Refused outright when it is
   * what verified the account.
   *
   * Omitting it keeps whatever is stored, which is what the screen does for
   * the locked one and is not the same as clearing it.
   */
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string | null;

  /**
   * A number, or null to remove the one on file. Refused the same way when it
   * is what verified the account.
   *
   * Shape only: separators are allowed through and stripped in the service,
   * the same way the email is lowercased there rather than trusted from the
   * client. How many digits it carries is checked once, after normalising.
   */
  @IsOptional()
  @Matches(/^\+?[\d\s-]{10,20}$/, { message: 'Enter a valid phone number' })
  phone?: string | null;
}
