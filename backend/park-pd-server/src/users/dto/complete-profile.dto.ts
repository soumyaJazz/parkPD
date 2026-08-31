import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import type { Gender } from '../users.service';

/** Kept in step with the client's Gender union and the User row. */
const GENDERS: Gender[] = ['male', 'female'];

// Which account is being filled in is not in here on purpose: it comes from
// the token the guard verified. A body field would let any signed-in caller
// write to someone else's profile by changing one value, and
// forbidNonWhitelisted now rejects the field outright if an old client sends it.
export class CompleteProfileDto {
  @IsString()
  @Length(2, 60, {
    message: 'Full name must be between 2 and 60 characters',
  })
  // The only character rule: names carry apostrophes, hyphens and scripts we
  // shouldn't be second-guessing, but a digit is a typo or a pasted field.
  @Matches(/^\D+$/, { message: 'Full name cannot contain numbers' })
  fullName!: string;

  // IsIn, not IsString: forbidNonWhitelisted rejects unknown props, but any
  // string at all would sail through without this
  @IsIn(GENDERS, { message: 'Select a valid gender' })
  gender!: Gender;

  /**
   * The single field the form's two age inputs collapse into. Shape only here -
   * whether the date exists and lands in an age we accept is checked in the
   * service, where 31/02 and a five-year-old get the same treatment.
   */
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'Date of birth must be DD/MM/YYYY',
  })
  dob!: string;

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
