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

  // requiring a token to get a token is circular - these two are how you
  // obtain one in the first place
  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email, dto.purpose, dto.method);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.challengeId, dto.otp, dto.purpose);
  }

  /**
   * Public because the access token is expired by definition when this is
   * called - the refresh token in the body is the credential here.
   *
   * The client refreshes roughly four times an hour, so this limit is loose
   * enough to never be hit legitimately and tight enough to cap a flood.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
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
