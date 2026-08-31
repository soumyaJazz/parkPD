import { IsEmail, IsIn, IsOptional } from 'class-validator';
import * as otpService from '../../otp/otp.service';
import type { AuthMethod } from '../auth.service';

export class RequestOtpDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email!: string;

  // IsIn, not IsString: forbidNonWhitelisted rejects unknown props, but a
  // string like "admin" would still sail through without this
  @IsIn(['login', 'signup'], { message: 'purpose must be login or signup' })
  purpose!: otpService.OtpPurpose;

  // what the user picked on the form, so the confirmation names the place the
  // code actually went. Optional, and email either way if it's left out.
  @IsOptional()
  @IsIn(['email', 'phone'], { message: 'method must be email or phone' })
  method?: AuthMethod = 'email';
}
