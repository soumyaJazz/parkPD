module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
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
