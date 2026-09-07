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
import {
  UsersService,
  User,
  normalizePhone,
  primaryContact,
  verifiedWith,
} from '../users/users.service';
import type { AuthMethod } from '../users/users.service';
import { SmsService } from '../sms/sms.service';
import { ApiPayload } from '../common/api-response';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Where the user asked for the code to go, and so what the account will be
 * proved by. Defined on the user row, which is what ends up holding it -
 * re-exported here because this is where callers have always reached for it.
 */
export type { AuthMethod };

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
  /**
   * The detail the account signs in with. Checked against the row by the
   * guard, so a token cannot outlive the identity it was issued for.
   *
   * The primary rather than the email, because the primary is the half that
   * never changes: binding to a spare email would sign a phone-account user
   * out every time they corrected their address.
   */
  contact: string;
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

/** Pragmatic check: a local part, an @, and a domain carrying a dot. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E.164 allows at most 15 digits; 10 is the shortest number we accept. */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/** Names the destination the way the user picked it, for the sent-code copy. */
const DESTINATION_LABEL: Record<AuthMethod, string> = {
  email: 'email address',
  phone: 'mobile number',
};

/**
 * The same names where a sentence needs the article. Written out rather than
 * derived, because "a"/"an" is a property of the word and guessing it from the
 * first letter is how copy ends up saying "a email address".
 */
const A_DESTINATION: Record<AuthMethod, string> = {
  email: 'an email address',
  phone: 'a mobile number',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private otpService: OtpService,
    private mailService: MailService,
    private smsService: SmsService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Whether this contact may start this flow, said in the terms the user will
   * read. All five answers are here rather than spread through the two callers
   * so that "which detail is this account" is decided in one place.
   *
   * The distinction that matters: an account is reachable at both its details,
   * but signs in at only one. A number sitting in the spare slot of an account
   * that signs in by email is a way of reaching that person, not a way of
   * becoming them - so a code is never sent to it.
   */
  private assertFlowAllowed(
    contact: string,
    purpose: OtpPurpose,
    method: AuthMethod,
  ): void {
    const label = DESTINATION_LABEL[method];
    // The account that signs in here, and whoever holds this detail at all.
    const signsIn = this.usersService.findByPrimary(contact, method);
    const holder = this.usersService.findByContact(contact, method);

    if (purpose === 'login') {
      if (signsIn) {
        return;
      }
      if (holder) {
        // Their detail, but not the one they sign in with. Naming the one that
        // does is the difference between a dead end and a next step.
        throw new NotFoundException(
          `That ${label} is on an account that signs in with ${A_DESTINATION[verifiedWith(holder)]}. Please use that instead.`,
        );
      }
      throw new NotFoundException(
        `No account found with this ${label}. Please sign up.`,
      );
    }

    if (signsIn) {
      throw new ConflictException(
        `An account with this ${label} already exists. Please log in.`,
      );
    }
    if (holder) {
      throw new ConflictException(
        `That ${label} is already on an account. Please log in with the ${DESTINATION_LABEL[verifiedWith(holder)]} on it.`,
      );
    }
  }

  /**
   * The contact as it will be stored and matched: an address lowercased, a
   * number reduced to digits with its country code. Done once, here, so what
   * the challenge holds and what an account holds cannot be spelled apart.
   *
   * Also where it is checked to actually be one of those. That rule depends on
   * `method`, which is why it is not on the DTO - see the note there.
   */
  private normalizeContact(raw: string, method: AuthMethod): string {
    if (method === 'phone') {
      const phone = normalizePhone(raw);
      const digits = phone.replace(/\D/g, '').length;
      if (digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS) {
        throw new BadRequestException('Enter a valid mobile number.');
      }
      return phone;
    }

    const email = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    return email;
  }

  /** Sends the code the way the user asked for it. */
  private async deliver(
    method: AuthMethod,
    contact: string,
    otp: string,
  ): Promise<void> {
    if (method === 'phone') {
      await this.smsService.sendOtp(contact, otp);
      return;
    }
    await this.mailService.sendOtp(contact, otp);
  }

  async requestOtp(
    rawContact: string,
    purpose: OtpPurpose,
    method: AuthMethod = 'email',
  ): Promise<ApiPayload<OtpChallenge>> {
    const contact = this.normalizeContact(rawContact, method);

    this.assertFlowAllowed(contact, purpose, method);

    const result = this.otpService.generateAndStore(contact, purpose, method);
    if (result.status === 'cooldown') {
      throw new HttpException(
        `Please wait ${result.retryAfterSeconds}s before requesting another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      await this.deliver(method, contact, result.otp);
    } catch (err) {
      // A sender that already said something useful - "we cannot text right
      // now, use your email" - has said it better than the line below could,
      // so it is passed through rather than flattened.
      if (err instanceof HttpException) {
        throw err;
      }
      // if SMTP or the SMS provider is down, a raw throw gives the client a
      // 500 with a stack trace - log the detail server side, return something
      // actionable
      this.logger.error(`Failed to send OTP to ${contact}`, err as Error);
      throw new HttpException(
        `Could not send the code to your ${DESTINATION_LABEL[method]}. Try again.`,
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
    // between. No await between the lookup and create, so within one request
    // this stays atomic and can't double-create.
    //
    // By the primary, matching the request step: a code that reached someone's
    // spare detail must not sign them in, and one was never sent there.
    const existing = this.usersService.findByPrimary(
      result.contact,
      result.method,
    );

    if (purpose === 'login') {
      if (!existing) {
        throw new NotFoundException(
          `No account found with this ${DESTINATION_LABEL[result.method]}. Please sign up.`,
        );
      }
      return {
        message: 'Logged in successfully.',
        data: await this.startSession(existing, false),
      };
    }

    if (existing) {
      throw new ConflictException(
        `An account with this ${DESTINATION_LABEL[result.method]} already exists. Please log in.`,
      );
    }

    // Stamped from the challenge, not from this request: it is the record of
    // which detail a code was actually delivered to, which is the whole of
    // what makes it the one the account cannot later be moved off.
    const user = this.usersService.create(result.contact, result.method);
    return {
      message: 'Your account has been created successfully.',
      data: await this.startSession(user, true),
    };
  }

  private async signAccessToken(
    user: User,
  ): Promise<{ token: string; expiresAt: number }> {
    const payload: JwtPayload = { sub: user.id, contact: primaryContact(user) };
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
