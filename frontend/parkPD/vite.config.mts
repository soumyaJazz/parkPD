import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Web build. The native app is bundled by Metro (`npm start`); this config only
 * covers `npm run web` and swaps react-native for its DOM implementation.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      /**
       * Anchored so only the bare `react-native` specifier is swapped. A plain
       * string alias also rewrites deep paths like
       * `react-native/Libraries/Utilities/codegenNativeComponent`, which have no
       * react-native-web counterpart and break the dependency scanner.
       */
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
    /**
     * `.web.*` wins on web, the way Metro prefers `.ios.*` / `.android.*`.
     * react-native-screens and react-native-safe-area-context both ship web
     * implementations that are only picked up because of this ordering.
     */
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
  },
  define: {
    // React Native code reads these; the DOM has no equivalent.
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  optimizeDeps: {
    /**
     * Only the packages shipping per-platform files (`.web.js` alongside native
     * ones) are excluded: the pre-bundler's scanner ignores the `.web.*`
     * resolution order and would pull in native-only specs. Everything else,
     * react-navigation included, must stay pre-bundled so its CommonJS
     * dependencies (e.g. use-latest-callback) get proper ESM interop.
     */
    exclude: ['react-native-safe-area-context', 'react-native-screens'],
  },
  server: {
    port: 3000,
    open: true,
  },
});
