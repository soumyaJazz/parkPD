const path = require('path');

/**
 * Which backend the app talks to, resolved at bundle time.
 *
 * `src/api/env/{local,test,prod}.ts` are three interchangeable modules. Rather
 * than shipping all three and branching at runtime, the bundler is told to put
 * exactly one of them behind the `parkpd/env` specifier, so the other two never
 * enter the bundle. Metro (`metro.config.js`), Vite (`vite.config.mts`) and
 * Jest (`jest.config.js`) all read this file so the three agree on the rules.
 *
 * CommonJS and `.cjs` because Metro and Jest configs are loaded by `require`,
 * before any TypeScript transform is available.
 */

/** The bare specifier the app imports. Nothing on disk answers to it. */
const ENV_SPECIFIER = 'parkpd/env';

const ENV_DIR = path.resolve(__dirname, 'src/api/env');

const KNOWN_ENVS = ['local', 'test', 'prod'];

/**
 * What you get when `PARKPD_ENV` is unset - which is every plain `npm start`,
 * `npm run android`, `npm run ios` and `npm run web`. The everyday case is a
 * server on this machine, so the everyday command needs no prefix.
 */
const DEFAULT_ENV = 'local';

function selectedEnv() {
  const requested = process.env.PARKPD_ENV;
  if (requested == null || requested === '') {
    return DEFAULT_ENV;
  }
  /**
   * Loud on a typo rather than quietly falling back. A silent default would
   * turn `PARKPD_ENV=production` (instead of `prod`) into a release build that
   * points at localhost, which only shows up once the APK is on a phone.
   */
  if (!KNOWN_ENVS.includes(requested)) {
    const known = KNOWN_ENVS.join(', ');
    throw new Error(
      `PARKPD_ENV="${requested}" is not a known environment. ` +
        `Expected one of: ${known}.`
    );
  }
  return requested;
}

/** Absolute path of the environment module the current build should use. */
function envModulePath() {
  return path.join(ENV_DIR, `${selectedEnv()}.ts`);
}

module.exports = {
  ENV_SPECIFIER,
  ENV_DIR,
  KNOWN_ENVS,
  DEFAULT_ENV,
  selectedEnv,
  envModulePath,
};
