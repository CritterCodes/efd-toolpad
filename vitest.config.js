import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
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
      // Tests only need refrakt's material VOCAB (pure data). Alias the package to its
      // lightweight core/library module so importing it doesn't pull JewelryViewer/Studio
      // → @react-three/fiber + drei (which need a DOM) into the node test env. The app
      // build still uses the real barrel. See docs/REFRAKT_1.2_VOCAB_HANDOFF.md.
      '@crittercodes/refrakt': fileURLToPath(new URL('./node_modules/@crittercodes/refrakt/src/core/library.js', import.meta.url)),
    },
  },
})
