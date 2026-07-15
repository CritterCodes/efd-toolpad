import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Component files are JSX inside plain .js. Vite's esbuild transform EXCLUDES .js by
  // default (its default exclude is /\.js$/), so JSX survived into import-analysis and
  // failed to parse. Set the loader to jsx (automatic runtime → no React import needed),
  // include .js/.jsx, and clear the default exclude so .js actually gets transformed.
  // Harmless for the JSX-free logic suites. Per-file `// @vitest-environment jsdom` opts
  // component tests into a DOM; the default env stays node for the pure-logic suites.
  esbuild: { loader: 'jsx', jsx: 'automatic', include: /\.jsx?$/, exclude: [] },
  test: {
    environment: 'node',
    globals: true,
    // Transform the refrakt source (extensionless internal imports) instead of
    // externalizing it to node's ESM loader, which can't resolve them.
    server: { deps: { inline: [/@crittercodes\/refrakt/] } },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@crittercodes/refrakt/server': fileURLToPath(new URL('./node_modules/@crittercodes/refrakt/src/server/index.js', import.meta.url)),
      // Tests only need refrakt's material VOCAB (pure data). Alias the package to its
      // lightweight core/library module so importing it doesn't pull JewelryViewer/Studio
      // → @react-three/fiber + drei (which need a DOM) into the node test env. The app
      // build still uses the real barrel. See docs/REFRAKT_1.2_VOCAB_HANDOFF.md.
      '@crittercodes/refrakt': fileURLToPath(new URL('./node_modules/@crittercodes/refrakt/src/core/library.js', import.meta.url)),
    },
  },
})
