/**
 * Re-export of the root `lib/appUrls.js` so `src/` can import it via the `@/lib/...` alias
 * (jsconfig maps `@/*` → `./src/*`, so the root `lib/` isn't reachable that way). Same pattern as
 * `src/lib/notificationService.js`. Keep the real implementation in one place — root `lib/` — since
 * root-level modules like `lib/email.js` cannot use the alias at all.
 *
 * THIS LIST IS LOAD-BEARING. It is an EXPLICIT re-export, so a symbol added to the root module does not
 * appear here automatically — it arrives as `undefined` and then fails at the CALL site, far from the
 * cause. That is exactly what happened with `portalLink`: publishing a quote 500'd with
 * "(0 , z.portalLink) is not a function" AFTER the quote had already been saved, so quotes looked
 * published while no email went out. Add every new export here in the same commit as the root one.
 */
export {
  adminBase, shopBase, adminLink, shopLink, portalLink, PORTAL_TABS,
} from '../../lib/appUrls.js';
