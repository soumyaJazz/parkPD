import type { EnvironmentSettings } from './types';

/**
 * A server on someone's laptop.
 *
 * The throttler is loosened rather than switched off, so the code path is the
 * same one production runs and a limit can still be hit deliberately while
 * testing - it just is not hit by ordinary development. Turning it off here
 * would mean the first time anyone exercises it is in production.
 */
export const environment: EnvironmentSettings = {
  name: 'local',

  database: {
    // One developer, one app. Ten connections to a local Postgres is nine
    // more than this ever needs.
    poolMax: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },

  throttle: {
    ip: { ttl: 60_000, limit: 10_000 },
    identity: { ttl: 60_000, limit: 10_000 },
  },

  logLevels: ['error', 'warn', 'log', 'debug', 'verbose'],
};
