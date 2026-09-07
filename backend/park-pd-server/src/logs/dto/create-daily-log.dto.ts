import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Flag } from '../../users/users.service';
import { DoseLogDto } from './dose-log.dto';

const FLAGS: Flag[] = [0, 1];

/** As in `DoseLogDto` - the one spelling of a moment this API accepts. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** `YYYY-MM-DD`. Shape only; whether the day exists is checked in the service. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** The Parkinson's medicines the day's log is kept for. */
export const MEDICINES = ['Syndopa', 'Syncapone'];

/** The stepper on the medication-plan question stops here. */
const MAX_DOSES_PER_DAY = 8;

/** Real UTC offsets run from -12:00 to +14:00. */
const MIN_UTC_OFFSET = -720;
const MAX_UTC_OFFSET = 840;

/** "4+ times" is the last option, so 4 is a floor rather than an exact count. */
const MAX_WAKE_COUNT = 4;

const MAX_ANSWERS = 32;
const MAX_ANSWER_LENGTH = 200;

/**
 * A whole day's log, as it arrives on the wire.
 *
 * Flat, because that is how the client sends it: `wake_time` and
 * `medicine_name` each say what they are without a wrapper to say it for them,
 * and rebuilding a nesting here that neither side wants would only be a shape
 * to keep in step. `doses` is the one nested part, because a dose really is a
 * repeated object.
 *
 * Whose log it is deliberately isn't a field: the account comes from the token
 * the guard verified. A `user_id` in the body would let any signed-in caller
 * write into someone else's diary by changing one value.
 */
export class CreateDailyLogDto {
  /**
   * The day being logged, `YYYY-MM-DD` in the user's own timezone.
   *
   * Local while every time below is UTC, and deliberately so: this is the day
   * the person lived, which is the thing they are logging.
   */
  @Matches(DAY_KEY, { message: 'Choose which day you are logging.' })
  log_date!: string;

  /**
   * The IANA zone the log was recorded in - "Asia/Kolkata" - or null on a
   * device that cannot name one. The instants are what make two logs
   * comparable; this is what lets a wake-up time be read back as the hour of
   * the morning it actually was.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string | null;

  /** Minutes east of UTC on the logged day - +330 for India. */
  @IsInt()
  @Min(MIN_UTC_OFFSET)
  @Max(MAX_UTC_OFFSET)
  utc_offset_minutes!: number;

  /* --- the morning check --- */

  @Matches(INSTANT, { message: 'Enter what time you woke up.' })
  wake_time!: string;

  /** May be empty: "None" is a real answer, not a skipped question. */
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  morning_symptoms!: string[];

  @IsInt()
  @Min(0)
  @Max(100, { message: 'Morning independence must be between 0 and 100.' })
  wakeup_independence_pct!: number;

  /** 1 when the day's activities were unaffected, 0 when they were limited. */
  @IsIn(FLAGS, {
    message: 'Answer whether your daily activities were affected.',
  })
  daily_activities_independence_flag!: Flag;

  /* --- the medication plan --- */

  @IsIn(MEDICINES, { message: 'Choose which medicine you took.' })
  medicine_name!: string;

  /** Occasions in the day, not tablets on any one of them. Zero is an answer. */
  @IsInt()
  @Min(0)
  @Max(MAX_DOSES_PER_DAY, {
    message: `You can log up to ${MAX_DOSES_PER_DAY} doses in a day.`,
  })
  dose_count!: number;

  /**
   * One entry per dose, in the order they were taken.
   *
   * `@Type` is what makes the nested rules run at all: without it each dose
   * stays a plain object, `DoseLogDto`'s decorators never fire, and the
   * ValidationPipe's `whitelist` strips the lot.
   */
  @IsArray()
  @ArrayMaxSize(MAX_DOSES_PER_DAY)
  @ValidateNested({ each: true })
  @Type(() => DoseLogDto)
  doses!: DoseLogDto[];

  /* --- the questions asked once for the whole day --- */

  /**
   * Null when nothing was chosen, never an empty list: these questions have no
   * "none" option of their own, so an empty list would be a claim the user
   * never made.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  other_meds?: string[] | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  med_side_effects?: string[] | null;

  /* --- the night --- */

  @IsIn(FLAGS, { message: 'Answer whether you woke during the night.' })
  night_wakeup_flag!: Flag;

  /** How many times, or null on an unbroken night. 4 means four or more. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WAKE_COUNT)
  night_wakeup_count?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANSWERS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  night_symptoms?: string[] | null;

  @IsOptional()
  @IsIn(FLAGS)
  night_symptoms_troublesome_flag?: Flag | null;
}
