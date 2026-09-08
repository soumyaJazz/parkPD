import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PG_POOL, withTransaction } from '../common/database.module';
import type { AuthMethod } from '../users/users.service';

export type OtpPurpose = 'login' | 'signup';

export type GenerateResult =
  | {
      status: 'ok';
      challengeId: string;
      otp: string;
      expiresAt: number;
      /** Epoch ms; asking for another code before this returns a cooldown. */
      resendAfter: number;
    }
  | { status: 'cooldown'; retryAfterSeconds: number };

/**
 * On success, `contact` is where the code went and `method` says which kind of
 * detail that was, so the account can record what proved it. Both are read off
 * the challenge rather than taken from the verify request: the client picks
 * where a code is sent, not what it counts as afterwards.
 */
export type VerifyResult =
  | { status: 'ok'; contact: string; method: AuthMethod }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'locked' }
  | { status: 'purpose-mismatch' }
  | { status: 'wrong'; attemptsLeft: number };

/** A challenge row, as far as verify() needs to read it. */
interface ChallengeRow {
  contact: string;
  otp_hash: string;
  purpose: OtpPurpose;
  method: AuthMethod;
  expires_at: Date;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private configService: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  // challengeId acts as the salt so two users holding the same code at the
  // same time don't produce the same hash. The secret is what stops anyone
  // who gets the table from hashing all 9k possible codes to reverse it.
  private hash(challengeId: string, otp: string): string {
    const secret = this.configService.get<string>(
      'OTP_HASH_SECRET',
      'dev-secret',
    );
    return crypto
      .createHmac('sha256', secret)
      .update(`${challengeId}:${otp}`)
      .digest('hex');
  }

  private generateCode(): string {
    const devCode = this.configService.get<string>('OTP_DEV_CODE');
    if (devCode) {
      // a fixed OTP means anyone who knows a challengeId can log in as
      // anyone, so keep it loud in the logs
      this.logger.warn(`OTP_DEV_CODE is active - all codes are "${devCode}"`);
      return devCode;
    }
    // randomInt, not Math.random: Math.random is predictable from previous
    // values, so an attacker who sees a few codes can guess the next one.
    // 4 digits is only 9k possibilities, so OTP_MAX_ATTEMPTS and the expiry
    // are what keep it out of guessing range - don't loosen both.
    return crypto.randomInt(1000, 10000).toString();
  }

  async generateAndStore(
    contact: string,
    purpose: OtpPurpose,
    method: AuthMethod,
  ): Promise<GenerateResult> {
    // without a cooldown a loop can flood a stranger's inbox and get the
    // SMTP account banned
    const cooldown = Number(
      this.configService.get<string>('OTP_RESEND_COOLDOWN_SECONDS', '60'),
    );

    const { rows } = await this.pool.query<{ created_at: Date }>(
      `SELECT created_at FROM otp_challenges
        WHERE contact = $1 AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1`,
      [contact],
    );

    if (rows[0]) {
      const elapsed = (Date.now() - rows[0].created_at.getTime()) / 1000;
      if (elapsed < cooldown) {
        return {
          status: 'cooldown',
          retryAfterSeconds: Math.ceil(cooldown - elapsed),
        };
      }
    }

    const otp = this.generateCode();
    const expiryMinutes = Number(
      this.configService.get<string>('OTP_EXPIRY_MINUTES', '5'),
    );
    // one timestamp for the whole record: reading the clock twice can land
    // either side of a millisecond and makes the two deadlines disagree
    const createdAt = Date.now();
    const expiresAt = createdAt + expiryMinutes * 60 * 1000;
    const challengeId = crypto.randomUUID();

    await withTransaction(this.pool, async (client) => {
      // Nothing else sweeps these, and a spent or lapsed challenge is dead
      // weight the resend lookup above would otherwise have to read past.
      await client.query(
        'DELETE FROM otp_challenges WHERE expires_at <= now()',
      );

      // one live OTP per destination, otherwise an older code still works and
      // widens the guessing window
      await client.query('DELETE FROM otp_challenges WHERE contact = $1', [
        contact,
      ]);

      await client.query(
        `INSERT INTO otp_challenges (
           challenge_id, contact, otp_hash, purpose, method,
           expires_at, attempts, created_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           to_timestamp($6 / 1000.0), 0, to_timestamp($7 / 1000.0)
         )`,
        [
          challengeId,
          contact,
          this.hash(challengeId, otp),
          // stamped from the caller: verify() compares it against the purpose
          // the client sends, so a code mailed for signup can't be spent on a
          // login
          purpose,
          method,
          expiresAt,
          createdAt,
        ],
      );
    });

    return {
      status: 'ok',
      challengeId,
      otp,
      expiresAt,
      // derived from the same cooldown the guard above enforces, so the
      // client's countdown can't drift out of step with the server's rule
      resendAfter: createdAt + cooldown * 1000,
    };
  }

  async verify(
    challengeId: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<VerifyResult> {
    const { rows } = await this.pool.query<ChallengeRow>(
      `SELECT contact, otp_hash, purpose, method, expires_at, attempts
         FROM otp_challenges
        WHERE challenge_id = $1`,
      [challengeId],
    );

    const record = rows[0];
    if (!record) {
      return { status: 'not-found' }; // never existed, or already used/swept
    }
    if (record.expires_at.getTime() < Date.now()) {
      return { status: 'expired' };
    }
    if (record.purpose !== purpose) {
      return { status: 'purpose-mismatch' };
    }

    const maxAttempts = Number(
      this.configService.get<string>('OTP_MAX_ATTEMPTS', '5'),
    );
    if (record.attempts >= maxAttempts) {
      return { status: 'locked' };
    }

    // timingSafeEqual, not ===: string compare exits at the first differing
    // character, so how long it takes leaks how much of the code was right.
    // Both sides are 64-char hex here, so the lengths always match.
    const candidate = this.hash(challengeId, otp);
    const match = crypto.timingSafeEqual(
      Buffer.from(candidate, 'hex'),
      Buffer.from(record.otp_hash, 'hex'),
    );

    if (!match) {
      // Incremented in the database rather than read, added to and written
      // back, so two guesses arriving together cost two attempts rather than
      // one.
      const { rows: counted } = await this.pool.query<{ attempts: number }>(
        `UPDATE otp_challenges SET attempts = attempts + 1
          WHERE challenge_id = $1
      RETURNING attempts`,
        [challengeId],
      );
      const attempts = counted[0]?.attempts ?? record.attempts + 1;
      return {
        status: 'wrong',
        attemptsLeft: Math.max(0, maxAttempts - attempts),
      };
    }

    // remove the row after successful verification, makes it single-use
    await this.pool.query(
      'DELETE FROM otp_challenges WHERE challenge_id = $1',
      [challengeId],
    );
    return {
      status: 'ok',
      contact: record.contact,
      method: record.method,
    };
  }
}
