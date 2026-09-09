module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  /**
   * Tests always run against the `local` environment, whatever `PARKPD_ENV`
   * happens to be set to in the shell. A suite that changed behaviour with an
   * ambient variable would be a bad trade for the little it would buy.
   */
  moduleNameMapper: {
    '^parkpd/env$': '<rootDir>/src/api/env/local.ts',
  },
  /**
   * `src/api/env/test.ts` is an API environment, not a test suite - but its
   * name matches Jest's default spec/test glob, so Jest collected it and then
   * failed it for containing no tests. The whole directory is configuration,
   * so none of it is ever a suite.
   */
  testPathIgnorePatterns: ['<rootDir>/src/api/env/'],
  /**
   * Which node_modules Jest is allowed to transform.
   *
   * The preset's own pattern only lets through `react-native/`,
   * `@react-native/` and `@react-native-community/` - so anything with a
   * hyphen after the scope, and the whole `@react-navigation` family, reached
   * Jest as raw ESM and failed on its first `export`. This widens it to any
   * package whose name starts with one of those, however it continues.
   */
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation)[-/])',
  ],
};
