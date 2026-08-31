import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type OtpPurpose = 'login' | 'signup';

interface OtpRecord {
  challengeId: string;
  email: string;
  otpHash: string; // hashed, never the raw code
  purpose: OtpPurpose; // which flow this challenge was issued for
  expiresAt: number;
  attempts: number; // wrong guesses so far, caps brute force
  createdAt: number; // used for the resend cooldown
}

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

export type VerifyResult =
  | { status: 'ok'; email: string }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'locked' }
  | { status: 'purpose-mismatch' }
  | { status: 'wrong'; attemptsLeft: number };

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  //path to fake db file
  private readonly filePath = path.join(process.cwd(), 'otp-store.json');

  constructor(private configService: ConfigService) {
    // if the file doesn't exist, create it with an empty array
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  // read all otp records from the file
  private readAll(): OtpRecord[] {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as OtpRecord[];
    } catch {
      // a truncated or hand-edited file would otherwise crash every request
      // with a JSON parse error
      this.logger.warn('otp-store.json was unreadable, starting from empty');
      return [];
    }
  }

  //overwrite the file with the given otp records
  private writeAll(records: OtpRecord[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2));
  }

  // same as readAll but drops expired rows, so the file stays self-cleaning
  private readLive(): OtpRecord[] {
    const now = Date.now();
    return this.readAll().filter((r) => r.expiresAt > now);
  }

  // challengeId acts as the salt so two users holding the same code at the
  // same time don't produce the same hash. The secret is what stops anyone
  // who gets the file from hashing all 900k possible codes to reverse it.
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

  generateAndStore(email: string, purpose: OtpPurpose): GenerateResult {
    const records = this.readLive();
    const existing = records.find((r) => r.email === email);

    // without a cooldown a loop can flood a stranger's inbox and get the
    // SMTP account banned
    const cooldown = Number(
      this.configService.get<string>('OTP_RESEND_COOLDOWN_SECONDS', '60'),
    );
    if (existing) {
      const elapsed = (Date.now() - existing.createdAt) / 1000;
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

    const record: OtpRecord = {
      challengeId,
      email,
      otpHash: this.hash(challengeId, otp),
      expiresAt,
      attempts: 0,
      createdAt,
      // stamped from the caller: verify() compares it against the purpose the
      // client sends, so a code mailed for signup can't be spent on a login
      purpose,
    };

    // one live OTP per email, otherwise an older code still works and
    // widens the guessing window
    this.writeAll([...records.filter((r) => r.email !== email), record]);

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

  verify(challengeId: string, otp: string, purpose: OtpPurpose): VerifyResult {
    const records = this.readLive();
    const record = records.find((r) => r.challengeId === challengeId);

    if (!record) {
      return { status: 'not-found' }; // never existed, or already used/swept
    }
    if (Date.now() > record.expiresAt) {
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
      Buffer.from(record.otpHash, 'hex'),
    );

    if (!match) {
      record.attempts += 1;
      this.writeAll(records); // persist the counter
      return {
        status: 'wrong',
        attemptsLeft: Math.max(0, maxAttempts - record.attempts),
      };
    }

    // remove the record after successful verification, makes it single-use
    this.writeAll(records.filter((r) => r.challengeId !== challengeId));
    return { status: 'ok', email: record.email };
  }
}
