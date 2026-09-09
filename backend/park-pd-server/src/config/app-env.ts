import { resolve } from 'node:path';

/**
 * Which deployment this process is. Mirrors `PARKPD_ENV` in the frontend, so
 * one word means the same thing on both sides of the repo.
 */
export const APP_ENVS = ['local', 'test', 'prod'] as const;

export type AppEnv = (typeof APP_ENVS)[number];

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

/**
 * The environment this process is running as.
 *
 * `PARKPD_ENV` decides, and when it is unset `NODE_ENV` does - so a platform
 * that only ever set `NODE_ENV=production` (which is every Railway deploy this
 * server has had) keeps behaving exactly as it did, and a second deploy becomes
 * a staging one by setting `PARKPD_ENV=test` and nothing else.
 *
 * Read straight from `process.env`, deliberately: this runs before ConfigModule
 * has loaded any file, because its answer is *which file to load*. Putting
 * `PARKPD_ENV` inside a `.env` file therefore does nothing - it has to come
 * from the real environment, from a shell or the Railway dashboard.
 */
export function resolveAppEnv(): AppEnv {
  const requested = process.env.PARKPD_ENV?.trim();

  if (requested) {
    if (!isAppEnv(requested)) {
      const known = APP_ENVS.join(', ');
      throw new Error(
        `PARKPD_ENV="${requested}" is not a known environment. ` +
          `Expected one of: ${known}.`,
      );
    }
    return requested;
  }

  return process.env.NODE_ENV === 'production' ? 'prod' : 'local';
}

/**
 * The env files to read, highest precedence first.
 *
 * ConfigModule keeps the first value it sees for a key, so `.env.<env>` wins
 * over `.env` - which leaves `.env` as the place for anything shared by every
 * environment on this machine, and the reason an existing single-file setup
 * keeps working untouched.
 *
 * Missing files are skipped rather than fatal, which is what makes this a
 * no-op on Railway: no file is deployed there, so every value comes from the
 * platform's own variables. Those win regardless - ConfigModule only assigns
 * keys that are not already in `process.env`.
 */
export function envFilePathsFor(env: AppEnv): string[] {
  return [
    resolve(process.cwd(), `.env.${env}`),
    resolve(process.cwd(), '.env'),
  ];
}
