import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import * as otpService from '../../otp/otp.service';
import type { AuthMethod } from '../auth.service';

/** Long enough for the longest sensible address, short enough to reject prose. */
const MAX_CONTACT_LENGTH = 254;

export class RequestOtpDto {
  /**
   * Where to send the code - an address or a number, depending on `method`.
   *
   * Shape only here. Whether it is a *valid* one of those is checked in the
   * service, because the answer depends on another field: class-validator
   * applies every condition on a property together, so "an email unless it is
   * a phone" cannot be spelled out with decorators without one rule silently
   * cancelling the other.
   */
  @IsString()
  @Length(3, MAX_CONTACT_LENGTH, {
    message: 'Enter the email address or mobile number to send the code to',
  })
  contact!: string;

  // IsIn, not IsString: forbidNonWhitelisted rejects unknown props, but a
  // string like "admin" would still sail through without this
  @IsIn(['login', 'signup'], { message: 'purpose must be login or signup' })
  purpose!: otpService.OtpPurpose;

  // Which kind of detail `contact` is, and so where the code goes and what the
  // account will be proved by. Optional, and email either way if left out.
  @IsOptional()
  @IsIn(['email', 'phone'], { message: 'method must be email or phone' })
  method?: AuthMethod = 'email';
}
