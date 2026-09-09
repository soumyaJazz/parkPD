import type { LogLevel } from '@nestjs/common';
import type { AppEnv } from '../app-env';

/**
 * Everything that varies by environment and is *not* a secret.
 *
 * The split is the point: a connection string, an SMTP password and a signing
 * key differ per environment too, but they belong in `.env.<env>` because they
 * must never be committed. What lives here is the other half - sizes, limits
 * and verbosity, which are safe in git and are better reviewed in a diff than
 * discovered in a dashboard.
 *
 * Every field is required. A new knob added to one environment has to be
 * answered for the other two, so `test` cannot quietly inherit a production
 * number nobody chose for it.
 */
export type EnvironmentSettings = {
  readonly name: AppEnv;

  readonly database: {
    /** Ceiling on concurrent connections held by this instance's pool. */
    readonly poolMax: number;
    /** How long an unused connection is kept before being handed back. */
    readonly idleTimeoutMillis: number;
    /** How long a caller waits for a connection before giving up. */
    readonly connectionTimeoutMillis: number;
  };

  /**
   * The two throttler buckets. See the note in `app.module.ts` for why there
   * are two and what each is actually protecting against.
   */
  readonly throttle: {
    readonly ip: { readonly ttl: number; readonly limit: number };
    readonly identity: { readonly ttl: number; readonly limit: number };
  };

  /** Which log levels reach the console. */
  readonly logLevels: readonly LogLevel[];
};
