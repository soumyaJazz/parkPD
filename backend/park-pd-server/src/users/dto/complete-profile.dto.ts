import { IsEmail, IsOptional, Matches } from 'class-validator';
import { ProfileAnswersDto } from './profile-answers.dto';

/**
 * The body of `POST /users/profile` - the form asked for once, straight after
 * sign-up.
 *
 * Everything but the contact details lives on the base class, which the edit
 * endpoint shares. What is added here is the pair of details setup alone can
 * accept: the account already carries whichever one it was verified with, and
 * this is the one chance to volunteer the other.
 */
export class CompleteProfileDto extends ProfileAnswersDto {
  // Optional because the account already carries whichever of the two it was
  // verified with; the form only sends the one it asked for.
  @IsOptional()
  @IsEmail({}, { message: 'A valid email is required' })
  email?: string;

  /**
   * Shape only: separators are allowed through and stripped in the service, the
   * same way the email is lowercased there rather than trusted from the client.
   * How many digits it actually carries is checked once, after normalising.
   */
  @IsOptional()
  @Matches(/^\+?[\d\s-]{10,20}$/, { message: 'Enter a valid phone number' })
  phone?: string;
}
