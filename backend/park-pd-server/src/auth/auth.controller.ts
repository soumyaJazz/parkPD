import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('request-otp')
  // Nest returns 201 for POST by default, but nothing is created here
  @HttpCode(HttpStatus.OK)
  // tighter than the global default because this one sends real email
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async requestOtp(@Body() dto: RequestOtpDto) {
    // same response shape whether or not the email is registered - a
    // different status for "unknown email" lets anyone enumerate accounts
    return this.authService.requestOtp(dto.email, dto.purpose, dto.method);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  // the attempt counter caps one challenge; this caps how fast they can
  // burn through fresh challenges
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    // TODO(jwt phase): sign and return accessToken alongside user
    return this.authService.verifyOtp(dto.challengeId, dto.otp, dto.purpose);
  }
}
