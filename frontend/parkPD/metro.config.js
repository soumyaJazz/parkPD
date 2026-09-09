const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { ENV_SPECIFIER, envModulePath, selectedEnv } = require('./env.config.cjs');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    /**
     * Points `parkpd/env` at one of `src/api/env/*.ts`. Metro has no `.env`
     * support to lean on - its inline transform only ever substitutes
     * `process.env.NODE_ENV` and `__DEV__`, so any other `process.env` read
     * survives into the bundle and finds nothing on a device. Swapping the
     * module instead keeps the choice at build time, where it belongs.
     */
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === ENV_SPECIFIER) {
        return { type: 'sourceFile', filePath: envModulePath() };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

// The dev server is long-lived and its environment is not otherwise visible.
console.log(`[parkPD] bundling against the "${selectedEnv()}" API environment`);

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
