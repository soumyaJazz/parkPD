import { resolveAppEnv, type AppEnv } from '../app-env';
import type { EnvironmentSettings } from './types';
import { environment as local } from './local';
import { environment as test } from './test';
import { environment as prod } from './prod';

/**
 * All three environments, selected at startup rather than at build time.
 *
 * This is where the backend deliberately parts company with the frontend. The
 * frontend has a bundler rewrite `parkpd/env` so the environments it did not
 * pick never reach the device - a phone should not be shipped a bundle
 * containing three servers' addresses. Node has no bundler and no such
 * audience, so a plain record read once at boot is the honest version: less
 * machinery, and `Record<AppEnv, ...>` makes the compiler check that every
 * environment is actually accounted for.
 */
const ENVIRONMENTS: Record<AppEnv, EnvironmentSettings> = {
  local,
  test,
  prod,
};

/** Which environment this process resolved to. */
export const appEnv: AppEnv = resolveAppEnv();

/** The settings for it. Import this; do not reach into the files directly. */
export const environment: EnvironmentSettings = ENVIRONMENTS[appEnv];

export type { EnvironmentSettings } from './types';
