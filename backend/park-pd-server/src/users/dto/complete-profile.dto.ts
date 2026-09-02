import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { DoseMode, Flag, Gender } from '../users.service';

/** Kept in step with the client's Gender union and the User row. */
const GENDERS: Gender[] = ['male', 'female'];

/** Yes/no answers travel as 0 and 1. */
const FLAGS: Flag[] = [0, 1];

const DOSE_MODES: DoseMode[] = ['pages', 'scroll'];

/**
 * Caps on the free-text answers. The lists themselves aren't pinned to fixed
 * values: "Other" lets the user describe a body part in their own words, and
 * the clinical lists are expected to grow, so a stale server shouldn't start
 * rejecting answers a newer form offers.
 */
const MAX_ANSWERS = 32;
const MAX_ANSWER_LENGTH = 200;

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
  full_name!: string;

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

  // --- the questionnaire, asked straight after the details above ---

  /**
   * Total months. The form asks for years and months separately and folds them
   * together, so there is one number here rather than two that could disagree.
   * Whether it exceeds the age the `dob` implies is checked in the service.
   */
  @IsInt({ message: 'Enter how long you have had Parkinson\u2019s disease' })
  @Min(1, { message: 'Enter at least one month' })
  p_duration!: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one first symptom' })
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  first_symptom!: string[];

  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one affected body part' })
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  first_affected_part!: string[];

  /**
   * Falls in the last year, or null for no history. IsOptional is what lets
   * null through; 0 stays a real answer, so it can't stand in for "never".
   *
   * Because null and "field omitted" look the same on the wire, the client is
   * what enforces that the question was actually put to the user.
   */
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Enter how many falls in the last year' })
  recc_falls?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  recc_falls_type?: string[] | null;

  @IsIn(FLAGS, { message: 'Answer the question about psychiatric illness' })
  psychiatric!: Flag;

  /**
   * The substances themselves, or null for no history. An empty array is
   * allowed on purpose - a "yes" the user didn't break down.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  addiction?: string[] | null;

  @IsIn(FLAGS, { message: 'Answer the question about REM sleep behaviour' })
  rem!: Flag;

  // May legitimately be empty - "None of these" is an answer, not a skip.
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  non_motor_symptoms!: string[];

  /**
   * Null for "no". IsOptional is what lets null through: 0 means diagnosed
   * within the last year, so it can't stand in for the absent case.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  diabetes_yrs?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  hypertension_yrs?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  thyroid_yrs?: number | null;

  @IsIn(FLAGS, { message: 'Answer the question about family history' })
  family_p_history!: Flag;

  @IsIn(FLAGS, { message: 'Answer the question about walking independently' })
  walk_independent!: Flag;

  @IsIn(FLAGS, { message: 'Answer the question about daily activities' })
  assistance_needed!: Flag;

  @IsIn(DOSE_MODES, { message: 'Choose how you would like to log your doses' })
  dose_mode!: DoseMode;
}
