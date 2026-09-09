import type { ApiEnvironment } from './types';

/**
 * PLACEHOLDER - no staging server exists yet.
 *
 * This host does not resolve, so a `test` build fails every request until the
 * URL below is replaced with a real deployment. That is deliberate: pointing
 * this at the production URL in the meantime would make a build labelled "test"
 * write to real user data, and the failure mode for that is much worse than a
 * build that visibly cannot reach its server.
 */
export const environment: ApiEnvironment = {
  name: 'test',
  apiBaseUrl: 'https://parkpd-staging.invalid',
};
