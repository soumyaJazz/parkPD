import type { EnvironmentSettings } from './types';

/**
 * The Railway deployment. These are the values this server has always run
 * with - moving them here changed where they are written, not what they are.
 */
export const environment: EnvironmentSettings = {
  name: 'prod',

  database: {
    // Comfortably under Postgres's default 100 connections, with room for
    // more than one instance of this server.
    poolMax: 10,
    // A connection idle this long is worth more back in the pool than held
    // open against a database on another host.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  },

  throttle: {
    ip: { ttl: 60_000, limit: 300 },
    identity: { ttl: 60_000, limit: 1_000 },
  },

  // No `debug` or `verbose`: on a deployed server those are volume, and the
  // lines that matter are harder to find buried in them.
  logLevels: ['error', 'warn', 'log'],
};
