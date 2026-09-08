import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { byChallenge, byContact, byRefreshToken } from './throttle-trackers';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '../users/users.service';
import type { ApiPayload } from '../common/api-response';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Requiring a token to get a token is circular - these two are how you
   * obtain one in the first place.
   *
   * Two limits apply. Per destination, this is the cheap backstop: the real
   * guard against pestering one person is the resend cooldown in `OtpService`,
   * which is enforced against the database and so holds across restarts and
   * across instances. Per address it is tighter than the global ceiling,
   * because every one of these sends an email and a host working through a
   * list of strangers is what would cost us a mail provider - but still loose
   * enough that a carrier's worth of people signing up do not collide.
   */
  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    ip: { limit: 30, ttl: 60_000 },
    identity: { limit: 5, ttl: 60_000, getTracker: byContact },
  })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.contact, dto.purpose, dto.method);
  }

  /**
   * Counted per challenge, because a guess is always aimed at one. The row's
   * own attempt counter is the cap that matters - see `OtpService.verify` -
   * and this only has to stop a burst arriving faster than that counter is
   * written.
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    ip: { limit: 60, ttl: 60_000 },
    identity: { limit: 10, ttl: 60_000, getTracker: byChallenge },
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.challengeId, dto.otp, dto.purpose);
  }

  /**
   * Public because the access token is expired by definition when this is
   * called - the refresh token in the body is the credential here.
   *
   * Counted per token, which is per signed-in device. The client refreshes
   * roughly four times an hour, so twenty a minute is far beyond anything
   * honest - but counted by address instead, a household or a waiting room on
   * one carrier would share that budget between them, and the phone that woke
   * up last would be the one signed out.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    ip: { limit: 120, ttl: 60_000 },
    identity: { limit: 20, ttl: 60_000, getTracker: byRefreshToken },
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto.refreshToken);
  }

  /** Public for the same reason: signing out has to work after a long idle. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Who the caller is, according to their access token. The app calls this on
   * launch to find out whether a token it saved is still worth trusting - the
   * guard has already rejected it if not, so reaching the handler is the answer.
   */
  @Get('me')
  me(@CurrentUser() user: User): ApiPayload<User> {
    return { message: 'Session is active.', data: user };
  }
}
