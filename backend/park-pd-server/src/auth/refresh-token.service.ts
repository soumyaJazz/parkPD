import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface RefreshTokenRecord {
  /** HMAC of the token. The token itself is never written to disk. */
  tokenHash: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}

export type ConsumeResult =
  | { status: 'ok'; userId: string }
  | { status: 'not-found' }
  | { status: 'expired' };

/** Live tokens one account may hold - one per signed-in device. */
const MAX_PER_USER = 10;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  private readonly filePath = path.join(process.cwd(), 'refresh-tokens.json');

  constructor(private configService: ConfigService) {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  private readAll(): RefreshTokenRecord[] {
    try {
      return JSON.parse(
        fs.readFileSync(this.filePath, 'utf-8'),
      ) as RefreshTokenRecord[];
    } catch {
      // a truncated or hand-edited file would otherwise crash every refresh
      this.logger.warn('refresh-tokens.json was unreadable, starting empty');
      return [];
    }
  }

  private writeAll(records: RefreshTokenRecord[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2));
  }

  /** Drops expired rows on every read, so the file stays self-cleaning. */
  private readLive(): RefreshTokenRecord[] {
    const now = Date.now();
    return this.readAll().filter((r) => r.expiresAt > now);
  }

  /**
   * Keyed hash, so the file alone is useless: someone who copies it still can't
   * turn a stored hash back into a working token without the secret.
   *
   * Deterministic on purpose. Unlike a per-row salted hash, this one can be
   * looked up directly, which is what lets consume() find a record in one pass.
   */
  private hash(token: string): string {
    const secret = this.configService.get<string>(
      'REFRESH_HASH_SECRET',
      'dev-refresh-secret',
    );
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  private ttlMs(): number {
    const days = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS', '60'),
    );
    return days * 24 * 60 * 60 * 1000;
  }

  issue(userId: string): { token: string; expiresAt: number } {
    // 256 bits from the CSPRNG. This is an opaque handle, not a JWT - it
    // carries no claims, so it tells a thief nothing, and it is worthless the
    // moment its row is gone.
    const token = crypto.randomBytes(32).toString('hex');
    const createdAt = Date.now();
    const expiresAt = createdAt + this.ttlMs();

    const record: RefreshTokenRecord = {
      tokenHash: this.hash(token),
      userId,
      expiresAt,
      createdAt,
    };

    // one row per signed-in device, newest kept. Without a cap every sign-in
    // leaves a row behind forever and the file only grows.
    const live = this.readLive();
    const mine = live
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_PER_USER - 1);
    const others = live.filter((r) => r.userId !== userId);

    this.writeAll([...others, ...mine, record]);
    return { token, expiresAt };
  }

  /**
   * Spends a refresh token: finds it, deletes it, reports whose it was. The
   * caller immediately issues a replacement, so every refresh rotates.
   *
   * Rotation is what limits a leak. A token that has been used once is dead, so
   * a copy taken from a log or a backup stops working the moment the real
   * device refreshes.
   */
  consume(token: string): ConsumeResult {
    const records = this.readAll();
    const tokenHash = this.hash(token);
    const record = records.find((r) => r.tokenHash === tokenHash);

    // a plain === is fine here, unlike the OTP compare. What's matched is a
    // 256-bit hash of the caller's own input, not a short secret worth learning
    // a byte at a time - and knowing a stored hash still produces no token.
    if (!record) {
      return { status: 'not-found' };
    }

    // deleted either way: an expired row has no further use
    this.writeAll(records.filter((r) => r.tokenHash !== tokenHash));

    if (Date.now() > record.expiresAt) {
      return { status: 'expired' };
    }
    return { status: 'ok', userId: record.userId };
  }

  /** Logout: drops this device's token, leaving other devices signed in. */
  revoke(token: string): void {
    const tokenHash = this.hash(token);
    this.writeAll(this.readAll().filter((r) => r.tokenHash !== tokenHash));
  }

  /** Sign out everywhere - every device this account is signed in on. */
  revokeAllForUser(userId: string): void {
    this.writeAll(this.readAll().filter((r) => r.userId !== userId));
  }
}
