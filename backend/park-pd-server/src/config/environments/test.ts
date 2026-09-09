import type { EnvironmentSettings } from './types';

/**
 * A staging deploy: shaped like production, watched like development.
 *
 * The limits match `prod` because the whole value of a staging environment is
 * that it fails the way production would. What differs is the logging, since
 * this is a deploy someone is actively reading the output of, and the pool,
 * since it serves a handful of testers rather than real traffic.
 */
export const environment: EnvironmentSettings = {
  name: 'test',

  database: {
    poolMax: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },

  throttle: {
    ip: { ttl: 60_000, limit: 300 },
    identity: { ttl: 60_000, limit: 1_000 },
  },

  logLevels: ['error', 'warn', 'log', 'debug'],
};
