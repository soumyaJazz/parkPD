import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { OtpService, OtpPurpose, VerifyResult } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { UsersService, User } from '../users/users.service';
import { ApiPayload } from '../common/api-response';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

/** Where the user asked for the code to go. */
export type AuthMethod = 'email' | 'phone';

/**
 * Why a verification failed, attached to the error under `error.details` so the
 * client can tell a wrong guess - which the same screen can retry - from a
 * challenge that is gone, which only a fresh code gets past. Reading the status
 * alone can't: every one of these is a 401. Reading `message` could, but that
 * copy is meant to be rewordable without breaking a client.
 */
export type VerifyFailureReason = Exclude<VerifyResult['status'], 'ok'>;

export interface OtpChallenge {
  challengeId: string;
  expiresAt: number;
  resendAfter: number;
}

/**
 * What goes inside the access token. `sub` is the JWT standard claim for "who
 * this token is about", which every library and debugger expects to read.
 *
 * A JWT payload is base64, not encrypted - anyone holding the token can read
 * every field here. Nothing goes in that we wouldn't be willing to show the
 * user, and nothing goes in that we aren't willing to re-check server side.
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** A signed-in session: the account, plus both halves of the credential. */
export interface AuthSession {
  user: User;
  isNewUser: boolean;
  /** Short-lived, sent on every request. */
  accessToken: string;
  /** Epoch ms, so the client can refresh before it lapses rather than after. */
  accessTokenExpiresAt: number;
  /** Long-lived, sent only to /auth/refresh and /auth/logout. */
  refreshToken: string;
  refreshTokenExpiresAt: number;
}

/** Names the destination the way the user picked it, for the sent-code copy. */
const DESTINATION_LABEL: Record<AuthMethod, string> = {
  email: 'email address',
  phone: 'mobile number',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private otpService: OtpService,
    private mailService: MailService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  // login needs an existing account, signup needs the absence of one.
  // Checked here at request time so we fail before sending an email, rather
  // than making the user type a code only to be rejected after.
  private assertFlowAllowed(email: string, purpose: OtpPurpose): void {
    const existing = this.usersService.findByEmail(email);

    if (purpose === 'login' && !existing) {
      throw new NotFoundException(
        'No account found with this email. Please sign up.',
      );
    }
    if (purpose === 'signup' && existing) {
      throw new ConflictException(
        'An account with this email already exists. Please log in.',
      );
    }
  }

  async requestOtp(
    rawEmail: string,
    purpose: OtpPurpose,
    method: AuthMethod = 'email',
  ): Promise<ApiPayload<OtpChallenge>> {
    // there is no SMS sender behind the phone option yet, so say so rather
    // than accepting the request and never delivering a code
    if (method === 'phone') {
      throw new BadRequestException(
        "Phone verification isn't available yet. Please use your email address.",
      );
    }

    const email = rawEmail.trim().toLowerCase();

    this.assertFlowAllowed(email, purpose);

    const result = this.otpService.generateAndStore(email, purpose);
    if (result.status === 'cooldown') {
      throw new HttpException(
        `Please wait ${result.retryAfterSeconds}s before requesting another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      await this.mailService.sendOtp(email, result.otp);
    } catch (err) {
      // if SMTP is down, a raw throw gives the client a 500 with a stack
      // trace - log the detail server side, return something actionable
      this.logger.error(`Failed to send OTP to ${email}`, err as Error);
      throw new HttpException(
        'Could not send the verification email. Try again.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // the OTP itself is deliberately absent - anything returned here is
    // visible to anyone who can see the response
    return {
      message: `A 4-digit code has been sent to your ${DESTINATION_LABEL[method]}.`,
      data: {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        resendAfter: result.resendAfter,
      },
    };
  }

  async verifyOtp(
    challengeId: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<ApiPayload<{ user: User; isNewUser: boolean }>> {
    const result = this.otpService.verify(challengeId, otp, purpose);

    switch (result.status) {
      case 'not-found':
        throw new UnauthorizedException({
          message: 'This code is no longer valid. Request a new one.',
          reason: result.status,
        });
      case 'expired':
        throw new UnauthorizedException({
          message: 'This code has expired. Request a new one.',
          reason: result.status,
        });
      case 'locked':
        throw new UnauthorizedException({
          message: 'Too many incorrect attempts. Request a new code.',
          reason: result.status,
        });
      case 'purpose-mismatch':
        throw new UnauthorizedException({
          message: 'This code was issued for a different action.',
          reason: result.status,
        });
      case 'wrong':
        throw new UnauthorizedException({
          message: `Incorrect code. ${result.attemptsLeft} attempt(s) remaining.`,
          reason: result.status,
        });
    }

    // re-checked here, not just at request time: minutes pass between the
    // two calls, and the account could have been created (or deleted) in
    // between. No await between findByEmail and create, so within one
    // request this stays atomic and can't double-create.
    const existing = this.usersService.findByEmail(result.email);

    if (purpose === 'login') {
      if (!existing) {
        throw new NotFoundException(
          'No account found with this email. Please sign up.',
        );
      }
      return {
        message: 'Logged in successfully.',
        data: await this.startSession(existing, false),
      };
    }

    if (existing) {
      throw new ConflictException(
        'An account with this email already exists. Please log in.',
      );
    }

    const user = this.usersService.create(result.email);
    return {
      message: 'Your account has been created successfully.',
      data: await this.startSession(user, true),
    };
  }

  private async signAccessToken(
    user: User,
  ): Promise<{ token: string; expiresAt: number }> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    // read the deadline back out of the token rather than recomputing it from
    // JWT_EXPIRES_IN - the token is the thing that actually expires, so this
    // can't drift out of step with it when the env var changes
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expiresAt: exp * 1000 }; // exp is seconds, JS wants ms
  }

  /**
   * The one place a session is minted. Sign-in, sign-up and refresh all come
   * through here, so the three can't drift apart in what they hand back.
   */
  private async startSession(
    user: User,
    isNewUser: boolean,
  ): Promise<AuthSession> {
    const access = await this.signAccessToken(user);
    const refresh = this.refreshTokenService.issue(user.id);

    return {
      user,
      isNewUser,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }

  /**
   * Trades a refresh token for a fresh pair. The old one is spent doing it, so
   * a token only ever works once.
   */
  async refreshSession(refreshToken: string): Promise<ApiPayload<AuthSession>> {
    const result = this.refreshTokenService.consume(refreshToken);

    if (result.status !== 'ok') {
      throw new UnauthorizedException({
        message: 'Your session has ended. Please sign in again.',
        reason: result.status,
      });
    }

    // the row outlived the account it belonged to - possible whenever a user
    // is deleted, since nothing goes back and sweeps their tokens
    const user = this.usersService.findById(result.userId);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Your session has ended. Please sign in again.',
        reason: 'no-account',
      });
    }

    return {
      message: 'Session refreshed.',
      data: await this.startSession(user, false),
    };
  }

  /**
   * Signing out. Deliberately silent about whether the token was real: the
   * outcome for the person is the same either way, and saying which would let
   * anyone test tokens against this endpoint for free.
   */
  logout(refreshToken: string): ApiPayload<null> {
    this.refreshTokenService.revoke(refreshToken);
    return { message: 'You have been signed out.' };
  }
}
