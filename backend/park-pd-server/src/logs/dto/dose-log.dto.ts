import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Flag } from '../../users/users.service';

/** Yes/no answers travel as 0 and 1, the same way the profile's do. */
const FLAGS: Flag[] = [0, 1];

/**
 * The only spelling of a moment this API accepts: exactly what the client's
 * `toISOString()` produces.
 *
 * Pinned to that one form rather than loosened to "any parseable date" so the
 * two sides cannot quietly drift - a client that starts sending a local
 * reading like "07:30" fails here, loudly, instead of storing a time that has
 * no timezone attached and is therefore unreadable a month later.
 */
const INSTANT = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`;

/** What the client sends when the medicine never took hold. */
export const NO_EFFECT = 'no-effect';

/** What it sends when the symptoms never came back. */
export const NO_RETURN = 'no-return';

/** A moment, or the one word that says the moment never arrived. */
function instantOr(sentinel: string): RegExp {
  return new RegExp(`^(?:${INSTANT}|${sentinel})$`);
}

/** A day cannot hold more dyskinesia than it has hours. Mirrors the client. */
const MAX_DYSKINESIA_MINUTES = 23 * 60 + 59;

/**
 * Four whole tablets plus a half is the most any one occasion can add up to -
 * the largest tile in each row of the dose question.
 */
const MAX_TABLETS = 4.5;

/** A quarter tablet is the smallest thing that still counts as a dose. */
const MIN_TABLETS = 0.25;

const MAX_BODY_PARTS = 16;
const MAX_ANSWER_LENGTH = 200;

/**
 * One dose, as it arrives on the wire.
 *
 * Shape only, in the same spirit as `CompleteProfileDto`: every rule that spans
 * two fields - "no first improvement means the six questions after it were
 * never asked" - is checked in `LogsService`, where the message can name the
 * dose it went wrong on.
 *
 * That is also why almost everything below is `@IsOptional()`. Null is a real,
 * expected answer here, not a missing one, and telling those two apart is a
 * cross-field job the decorators cannot do on their own.
 */
export class DoseLogDto {
  /** When it was swallowed. */
  @Matches(new RegExp(`^${INSTANT}$`), {
    message: 'Enter the time each dose was taken.',
  })
  dose_time!: string;

  /**
   * Tablets on this occasion - 1, 1.5, 2.333. Three decimal places because a
   * third of a tablet has no exact one and the client rounds it there.
   */
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Enter how many tablets were taken.' },
  )
  @Min(MIN_TABLETS, { message: 'A dose must be at least a quarter tablet.' })
  @Max(MAX_TABLETS, {
    message: 'That is more tablets than a single dose holds.',
  })
  tablets_count!: number;

  /**
   * 0-100: how active the person was in the run-up to swallowing it.
   *
   * Required, not optional, and that is the point of it: it is asked beside
   * "when did you take this dose", before anything is known about whether the
   * dose worked, so it is one of the three answers every dose carries however
   * the rest of it went. The peak's `pal_pct` is the other end of the same
   * measurement, and subtracting one from the other is what says how much the
   * dose was worth.
   */
  @IsInt({ message: 'Enter how active you were before taking this dose.' })
  @Min(0)
  @Max(100, { message: 'Activity level must be between 0 and 100.' })
  pre_med_al_pct!: number;

  /** A moment, or `"no-effect"` when the dose never worked. */
  @Matches(instantOr(NO_EFFECT), {
    message: 'Enter when you first felt the medicine working.',
  })
  first_effect_time!: string;

  /** A moment, `"no-effect"`, or null when the dose never worked at all. */
  @IsOptional()
  @Matches(instantOr(NO_EFFECT), {
    message: 'Enter when the medicine was working best.',
  })
  peak_effect_time?: string | null;

  /**
   * 0-100: how much of the usual activity was possible at the peak.
   *
   * Optional where `pre_med_al_pct` is not, because this one is only asked
   * of a dose that worked - a dose that never took hold has no peak to rate.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100, { message: 'Activity level must be between 0 and 100.' })
  pal_pct?: number | null;

  @IsOptional()
  @IsIn(FLAGS)
  at_pal_dl_affected_flag?: Flag | null;

  @IsOptional()
  @IsIn(FLAGS)
  dysky_flag?: Flag | null;

  /** Minutes of involuntary movement. Only asked when `dysky_flag` is 1. */
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Enter how long the involuntary movements lasted.' })
  @Max(MAX_DYSKINESIA_MINUTES, {
    message: 'Involuntary movements cannot last longer than a day.',
  })
  dysky_duration?: number | null;

  /**
   * Where it was felt. Not pinned to a fixed list: the body-part options are
   * expected to grow, and a server one release behind should not start
   * rejecting an answer a newer app offers.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BODY_PARTS)
  @IsString({ each: true })
  @MaxLength(MAX_ANSWER_LENGTH, { each: true })
  dysky_body_part?: string[] | null;

  @IsOptional()
  @IsIn(FLAGS)
  dysky_dl_affected_flag?: Flag | null;

  /** A moment, or `"no-return"` when the symptoms stayed away. */
  @IsOptional()
  @Matches(instantOr(NO_RETURN), {
    message: 'Enter when the medicine wore off.',
  })
  med_wear_off_time?: string | null;

  @IsOptional()
  @IsIn(FLAGS)
  off_period_dl_affected_flag?: Flag | null;
}
