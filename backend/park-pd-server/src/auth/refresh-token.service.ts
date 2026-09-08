import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PG_POOL, withTransaction } from '../common/database.module';

export type ConsumeResult =
  | { status: 'ok'; userId: string }
  | { status: 'not-found' }
  | { status: 'expired' };

/** Live tokens one account may hold - one per signed-in device. */
const MAX_PER_USER = 10;

@Injectable()
export class RefreshTokenService {
  constructor(
    private configService: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Keyed hash, so the table alone is useless: someone who copies it still
   * can't turn a stored hash back into a working token without the secret.
   *
   * Deterministic on purpose. Unlike a per-row salted hash, this one can be
   * looked up directly, which is what lets consume() find a row in one pass.
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

  async issue(userId: string): Promise<{ token: string; expiresAt: number }> {
    // 256 bits from the CSPRNG. This is an opaque handle, not a JWT - it
    // carries no claims, so it tells a thief nothing, and it is worthless the
    // moment its row is gone.
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.ttlMs();

    await withTransaction(this.pool, async (client) => {
      // Expired rows have no further use and nothing else sweeps them.
      await client.query(
        'DELETE FROM refresh_tokens WHERE expires_at <= now()',
      );

      // One row per signed-in device, newest kept. Without a cap every sign-in
      // leaves a row behind until it expires and the table only grows. The
      // trim leaves room for the one about to be inserted.
      await client.query(
        `DELETE FROM refresh_tokens
          WHERE token_hash IN (
            SELECT token_hash FROM refresh_tokens
             WHERE user_id = $1
             ORDER BY created_at DESC
            OFFSET $2
          )`,
        [userId, MAX_PER_USER - 1],
      );

      await client.query(
        `INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, to_timestamp($3 / 1000.0))`,
        [this.hash(token), userId, expiresAt],
      );
    });

    return { token, expiresAt };
  }

  /**
   * Spends a refresh token: finds it, deletes it, reports whose it was. The
   * caller immediately issues a replacement, so every refresh rotates.
   *
   * Rotation is what limits a leak. A token that has been used once is dead, so
   * a copy taken from a log or a backup stops working the moment the real
   * device refreshes.
   *
   * The find and the delete are one statement, which is what makes that true
   * under concurrency: two requests arriving with the same token cannot both
   * match it, because only one of them gets a row back.
   */
  async consume(token: string): Promise<ConsumeResult> {
    // A plain match is fine here, unlike the OTP compare. What's matched is a
    // 256-bit hash of the caller's own input, not a short secret worth learning
    // a byte at a time - and knowing a stored hash still produces no token.
    const { rows } = await this.pool.query<{
      user_id: string;
      expires_at: Date;
    }>(
      `DELETE FROM refresh_tokens
        WHERE token_hash = $1
    RETURNING user_id, expires_at`,
      [this.hash(token)],
    );

    const record = rows[0];
    if (!record) {
      return { status: 'not-found' };
    }
    // Deleted either way by the statement above: an expired row has no use.
    if (record.expires_at.getTime() < Date.now()) {
      return { status: 'expired' };
    }
    return { status: 'ok', userId: record.user_id };
  }

  /** Logout: drops this device's token, leaving other devices signed in. */
  async revoke(token: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [
      this.hash(token),
    ]);
  }

  /** Sign out everywhere - every device this account is signed in on. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [
      userId,
    ]);
  }
}
