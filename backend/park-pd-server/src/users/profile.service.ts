import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiPayload } from '../common/api-response';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ProfileAnswersDto } from './dto/profile-answers.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  User,
  UsersService,
  normalizePhone,
  sameNumber,
  verifiedWith,
} from './users.service';
import type { AuthMethod } from './users.service';

/** Mirrors the client's bounds, so the two agree on who is old enough. */
const MIN_AGE = 13;
const MAX_AGE = 120;

const MONTHS_PER_YEAR = 12;

/** E.164 allows at most 15 digits; 10 is the shortest number we accept. */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

const DOB_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Parses `DD/MM/YYYY`, or null. Dates that only look valid are rejected: the
 * Date constructor rolls 31/02 over into March, so the parts are read back off
 * the result and compared with what went in.
 */
function parseDob(value: string): Date | null {
  const match = DOB_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Full years between a birth date and today. */
function ageFromDate(date: Date): number {
  const today = new Date();
  const years = today.getFullYear() - date.getFullYear();
  const beforeBirthday =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  return beforeBirthday ? years - 1 : years;
}

/** Said the same way wherever the token outlived the account it named. */
const NO_ACCOUNT = 'We could not find your account. Please sign up again.';

@Injectable()
export class ProfileService {
  constructor(private usersService: UsersService) {}

  /**
   * Saves the details asked for once, straight after sign-up.
   *
   * A contact detail is only accepted for a slot the account doesn't already
   * fill: the one it was verified with is the address a code was actually
   * delivered to, and this is not the endpoint that swaps it.
   *
   * `userId` is passed separately from the body because it comes from a
   * different place: the controller reads it off the verified token, so it is
   * the one value here the caller cannot choose.
   */
  completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): ApiPayload<{ user: User }> {
    const user = this.requireUser(userId);

    // Setup runs once. A second save can only be a stale screen or a retry
    // after the first one landed, and either way it must not overwrite a
    // profile that is already there.
    if (user.profile_completed_at) {
      throw new ConflictException('Your profile has already been set up.');
    }

    const patch: Partial<User> = {
      ...this.checkedAnswers(dto),
      profile_completed_at: new Date().toISOString(),
    };

    if (dto.email !== undefined) {
      patch.email = this.acceptEmail(user, dto.email);
    }
    if (dto.phone !== undefined) {
      patch.phone = this.acceptPhone(user, dto.phone);
    }

    return {
      message: 'Your profile is all set.',
      data: { user: this.write(user.id, patch) },
    };
  }

  /**
   * Saves the same form, reopened from the profile screen.
   *
   * Every answer is rewritten from what arrives, because the screen sends the
   * whole form back - so this is a replacement rather than a merge, and an
   * answer the user cleared genuinely clears.
   *
   * Both contact details can be sent, and exactly one of them is refused: the
   * one a code was actually delivered to. That detail is what the account is,
   * so moving it here would hand the account to a destination nobody has
   * proved they can read. The other was only ever typed in, so it is the
   * user's to change or remove.
   *
   * Which is which comes off the row, never off the request.
   */
  updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): ApiPayload<{ user: User }> {
    const user = this.requireUser(userId);

    // Nothing to edit yet. Reaching this without finishing setup means a
    // client got ahead of itself, and letting it through would write a profile
    // that never went through the once-only path above.
    if (!user.profile_completed_at) {
      throw new BadRequestException(
        'Please finish setting up your profile first.',
      );
    }

    const patch: Partial<User> = {
      ...this.checkedAnswers(dto),
      profile_updated_at: new Date().toISOString(),
    };

    const verified = verifiedWith(user);

    // Undefined is what removes a key when the row is written back out:
    // JSON.stringify drops it, so the account reads as having no number rather
    // than as having an empty one.
    if (dto.email !== undefined) {
      patch.email = this.acceptEditedEmail(user, verified, dto.email);
    }
    if (dto.phone !== undefined) {
      patch.phone = this.acceptEditedPhone(user, verified, dto.phone);
    }

    return {
      message: 'Your profile has been updated.',
      data: { user: this.write(user.id, patch) },
    };
  }

  /** The account behind a verified token, or the one thing left to say. */
  private requireUser(userId: string): User {
    const user = this.usersService.findById(userId);
    if (!user) {
      // the token verified against an account that has since gone
      throw new NotFoundException(NO_ACCOUNT);
    }
    return user;
  }

  /** Applies a patch, treating a row that vanished mid-request as gone. */
  private write(userId: string, patch: Partial<User>): User {
    const updated = this.usersService.update(userId, patch);
    if (!updated) {
      throw new NotFoundException(NO_ACCOUNT);
    }
    return updated;
  }

  /**
   * The answers both endpoints take, checked over and put into the shape the
   * row stores. Everything that can be rejected is rejected before the first
   * field is written, so a bad request never leaves a half-saved profile.
   */
  private checkedAnswers(dto: ProfileAnswersDto): Partial<User> {
    const dob = parseDob(dto.dob);
    if (!dob) {
      throw new BadRequestException('Enter a valid date of birth.');
    }

    const age = ageFromDate(dob);
    if (age < MIN_AGE) {
      throw new BadRequestException(
        `You must be at least ${MIN_AGE} years old to use parkPD.`,
      );
    }
    if (age > MAX_AGE) {
      throw new BadRequestException('Enter a valid date of birth.');
    }

    this.assertQuestionnaireConsistent(dto, age);

    return {
      full_name: dto.full_name.trim().replace(/\s+/g, ' '),
      gender: dto.gender,
      dob: dto.dob,

      // The questionnaire, stored under the wire names it arrived with.
      p_duration: dto.p_duration,
      first_symptom: dto.first_symptom,
      first_affected_part: dto.first_affected_part,
      // Normalised to null rather than left undefined, so "no history" is a
      // stored answer instead of a missing key indistinguishable from an old
      // row that was never asked.
      recc_falls: dto.recc_falls ?? null,
      recc_falls_type:
        dto.recc_falls == null ? null : (dto.recc_falls_type ?? []),
      psychiatric: dto.psychiatric,
      addiction: dto.addiction ?? null,
      rem: dto.rem,
      non_motor_symptoms: dto.non_motor_symptoms,
      diabetes_yrs: dto.diabetes_yrs ?? null,
      hypertension_yrs: dto.hypertension_yrs ?? null,
      thyroid_yrs: dto.thyroid_yrs ?? null,
      family_p_history: dto.family_p_history,
      walk_independent: dto.walk_independent,
      assistance_needed: dto.assistance_needed,
      dose_mode: dto.dose_mode,
    };
  }

  /**
   * The rules that span more than one answer, which the DTO decorators can't
   * see: a follow-up has to match the answer that revealed it, and nothing can
   * have been true for longer than the person has been alive.
   */
  private assertQuestionnaireConsistent(
    dto: ProfileAnswersDto,
    age: number,
  ): void {
    if (dto.p_duration > age * MONTHS_PER_YEAR) {
      throw new BadRequestException(
        'You cannot have had Parkinson’s disease for longer than your age.',
      );
    }

    // A count means there were falls, so how they came about has to come with
    // it. Null is "no history", and characterising falls that never happened
    // would be recording an answer nobody was asked for.
    if (dto.recc_falls != null && !dto.recc_falls_type?.length) {
      throw new BadRequestException(
        'Say whether the falls were provoked or unprovoked.',
      );
    }
    if (dto.recc_falls == null && dto.recc_falls_type?.length) {
      throw new BadRequestException(
        'Enter how many falls you had in the last year.',
      );
    }

    // Named so the message can say which condition was wrong, rather than
    // making the user work out which of the three the server meant.
    const conditions: Array<[string, number | null | undefined]> = [
      ['Diabetes', dto.diabetes_yrs],
      ['Hypertension', dto.hypertension_yrs],
      ['Thyroid disorder', dto.thyroid_yrs],
    ];
    conditions.forEach(([label, years]) => {
      if (years !== undefined && years !== null && years > age) {
        throw new BadRequestException(
          `${label} cannot have lasted longer than your age.`,
        );
      }
    });
  }

  private acceptEmail(user: User, incoming: string): string {
    const email = incoming.trim().toLowerCase();

    if (user.email && user.email !== email) {
      throw new BadRequestException(
        'Your email address was confirmed at sign-up and cannot be changed here.',
      );
    }

    const owner = this.usersService.findByEmail(email);
    if (owner && owner.id !== user.id) {
      throw new ConflictException(
        'That email address is already on another account.',
      );
    }
    return email;
  }

  private acceptPhone(user: User, incoming: string): string {
    const phone = this.checkedPhone(user, incoming);

    if (user.phone && !sameNumber(user.phone, phone)) {
      throw new BadRequestException(
        'Your phone number was confirmed at sign-up and cannot be changed here.',
      );
    }
    return phone;
  }

  /**
   * The address as the profile screen may change it.
   *
   * Locked when it is what verified the account: not merely unchangeable, but
   * unremovable too - an account cannot be left with no way to sign in. An
   * unchanged value is waved through rather than refused, so a screen that
   * echoes back what it was shown is not treated as an attempt to move it.
   */
  private acceptEditedEmail(
    user: User,
    verified: AuthMethod,
    incoming: string | null,
  ): string | undefined {
    if (verified === 'email') {
      if (incoming === null || incoming.trim().toLowerCase() !== user.email) {
        throw new BadRequestException(
          'Your email address was confirmed at sign-up and cannot be changed here.',
        );
      }
      return user.email;
    }

    if (incoming === null) {
      return undefined;
    }

    const email = incoming.trim().toLowerCase();
    const owner = this.usersService.findByEmail(email);
    if (owner && owner.id !== user.id) {
      throw new ConflictException(
        'That email address is already on another account.',
      );
    }
    return email;
  }

  /** The number, under the same rule from the other side. */
  private acceptEditedPhone(
    user: User,
    verified: AuthMethod,
    incoming: string | null,
  ): string | undefined {
    if (verified === 'phone') {
      if (
        incoming === null ||
        user.phone === undefined ||
        !sameNumber(incoming, user.phone)
      ) {
        throw new BadRequestException(
          'Your phone number was confirmed at sign-up and cannot be changed here.',
        );
      }
      return user.phone;
    }

    return incoming === null ? undefined : this.checkedPhone(user, incoming);
  }

  /** Normalised, long enough to be a number, and nobody else's. */
  private checkedPhone(user: User, incoming: string): string {
    const phone = normalizePhone(incoming);
    const digits = phone.replace(/\D/g, '').length;

    if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
      throw new BadRequestException('Enter a valid phone number.');
    }

    const owner = this.usersService.findByPhone(phone);
    if (owner && owner.id !== user.id) {
      throw new ConflictException(
        'That phone number is already on another account.',
      );
    }
    return phone;
  }
}
