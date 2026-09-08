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
      /**
       * react-native-svg reaches for React Native's own asset registry, which
       * is a native-only package. react-native-web ships the same module for
       * the DOM, and pointing at it is what the RNW docs prescribe.
       */
      {
        find: '@react-native/assets-registry/registry',
        replacement: 'react-native-web/dist/modules/AssetRegistry',
      },
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
     * The dependency pre-bundler resolves on its own, and by default it knows
     * nothing about `.web.*` - which is how it ended up reading React Native's
     * Flow source through a package's native entry. Giving it the same order
     * the app uses is what keeps the two halves agreeing.
     */
    rolldownOptions: {
      resolve: {
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
    },
    /**
     * These two ship per-platform files and are left unbundled, so Vite's own
     * resolver picks the `.web.*` half at request time.
     *
     * react-native-svg is deliberately not in this list: one of its generated
     * parsers is CommonJS even inside its ESM build, and pre-bundling is what
     * converts that into something a browser can import.
     */
    exclude: ['react-native-safe-area-context', 'react-native-screens'],
  },
  server: {
    port: 3000,
    open: true,
  },
});
