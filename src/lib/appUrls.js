/**
 * Re-export of the root `lib/appUrls.js` so `src/` can import it via the `@/lib/...` alias
 * (jsconfig maps `@/*` → `./src/*`, so the root `lib/` isn't reachable that way). Same pattern as
 * `src/lib/notificationService.js`. Keep the real implementation in one place — root `lib/` — since
 * root-level modules like `lib/email.js` cannot use the alias at all.
 */
export { adminBase, shopBase, adminLink, shopLink } from '../../lib/appUrls.js';
