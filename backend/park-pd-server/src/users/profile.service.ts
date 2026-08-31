import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiPayload } from '../common/api-response';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { User, UsersService } from './users.service';

/** Mirrors the client's bounds, so the two agree on who is old enough. */
const MIN_AGE = 13;
const MAX_AGE = 120;

/** E.164 allows at most 15 digits; 10 is the shortest number we accept. */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/**
 * Reduces a number to the form we store: digits, keeping a leading '+' for the
 * country code. Two spellings of one number normalise to the same string, so
 * neither the duplicate check nor the comparison below turns on formatting.
 */
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  return input.trimStart().startsWith('+') ? `+${digits}` : digits;
}

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
    const user = this.usersService.findById(userId);
    if (!user) {
      // the token verified against an account that has since gone
      throw new NotFoundException(
        'We could not find your account. Please sign up again.',
      );
    }

    // Setup runs once. A second save can only be a stale screen or a retry
    // after the first one landed, and either way it must not overwrite a
    // profile that is already there.
    if (user.profileCompletedAt) {
      throw new ConflictException('Your profile has already been set up.');
    }

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

    const patch: Partial<User> = {
      fullName: dto.fullName.trim().replace(/\s+/g, ' '),
      gender: dto.gender,
      dob: dto.dob,
      profileCompletedAt: new Date().toISOString(),
    };

    if (dto.email !== undefined) {
      patch.email = this.acceptEmail(user, dto.email);
    }
    if (dto.phone !== undefined) {
      patch.phone = this.acceptPhone(user, dto.phone);
    }

    const updated = this.usersService.update(user.id, patch);
    if (!updated) {
      throw new NotFoundException(
        'We could not find your account. Please sign up again.',
      );
    }

    return {
      message: 'Your profile is all set.',
      data: { user: updated },
    };
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
    const phone = normalizePhone(incoming);
    const digits = phone.replace(/\D/g, '').length;

    if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
      throw new BadRequestException('Enter a valid phone number.');
    }

    if (user.phone && normalizePhone(user.phone) !== phone) {
      throw new BadRequestException(
        'Your phone number was confirmed at sign-up and cannot be changed here.',
      );
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
