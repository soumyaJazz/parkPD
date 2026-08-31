import { IsString, IsUUID, Length, Matches, IsIn } from 'class-validator';
import * as otpService from '../../otp/otp.service';

export class VerifyOtpDto {
  // challengeId comes from crypto.randomUUID(), so anything else is a typo
  // or someone probing - rejected without touching the file
  @IsUUID('4', { message: 'Invalid challenge' })
  challengeId!: string;

  // exactly 4: the generator and OTP_DEV_CODE both produce 4 digits, so a
  // longer code can only be a client that got out of step
  @IsString()
  @Length(4, 4, { message: 'Code must be 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Code must be numeric' })
  otp!: string;

  // IsIn, not IsString: forbidNonWhitelisted rejects unknown props, but a
  // string like "admin" would still sail through without this
  @IsIn(['login', 'signup'], { message: 'purpose must be login or signup' })
  purpose!: otpService.OtpPurpose;
}
