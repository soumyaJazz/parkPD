import { environment } from 'parkpd/env';

/**
 * `parkpd/env` is not a package. It is a stand-in that Metro, Vite and Jest
 * each rewrite to one of `src/api/env/{local,test,prod}.ts`, chosen by the
 * `PARKPD_ENV` variable the npm script sets - see `env.config.cjs` for the
 * shared rules and `package.json` for which script picks which environment.
 *
 * Selecting at bundle time rather than branching on `__DEV__` is what lets a
 * *development* build talk to a *deployed* server: `npm start` and
 * `npm run start:prod` produce the same kind of build, pointed at different
 * backends. Keying on `__DEV__` would instead tie the deployed server to
 * release builds - the one build nobody runs while developing.
 */

/** Origin every request is prefixed with. No trailing slash. */
export const API_BASE_URL = environment.apiBaseUrl;

/** Which environment this bundle was built for. Useful in bug reports. */
export const API_ENV_NAME = environment.name;

/** Long enough to cover a cold SMTP handshake, short enough to not look frozen. */
export const API_TIMEOUT_MS = 15000;
