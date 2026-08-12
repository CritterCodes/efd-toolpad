/**
 * Absolute base URLs for THIS app and the shop.
 *
 * WHY THIS EXISTS: `process.env.NEXT_PUBLIC_ADMIN_URL` was interpolated at ~26 call sites, and none of
 * them were safe when the var is unset — which it is in production:
 *   - 19 sites used `|| ''`, producing a RELATIVE href like "/dashboard/payroll". Inert in an email
 *     client, which is the only place these links are ever used.
 *   - 7 sites had no fallback at all, producing the literal string "undefined/products/abc".
 * Every repair, payroll, product-submission, drop, collection, custom and bench notification carried
 * one of those. Centralised so there is one place to be right.
 *
 * `NEXTAUTH_URL` is in the chain deliberately (owner, 2026-07-29: "don't we already have a similar
 * secret") — it IS this app's canonical base URL and NextAuth requires it in production, so it is
 * always set and no new deploy-time env var is needed. Both env reads are SERVER-ONLY
 * (`NEXTAUTH_URL` / `EFD_SHOP_URL` are not `NEXT_PUBLIC_`), which is correct for notification and
 * email paths. Do not call these from a client component — use the `NEXT_PUBLIC_*` vars directly there.
 *
 * Lives in root `lib/` so both `lib/` and `src/` can reach it; `src/lib/appUrls.js` re-exports for the
 * `@/lib/...` alias (same pattern as notificationService).
 */

const ADMIN_FALLBACK = 'https://admin.engelfinedesign.com';
const SHOP_FALLBACK = 'https://shop.engelfinedesign.com';

/** Strip trailing slashes so callers can always append "/path" without doubling up. */
const clean = (u) => String(u || '').trim().replace(/\/+$/, '');

/** This app's absolute base URL, never empty and never "undefined". */
export function adminBase() {
  return clean(process.env.NEXT_PUBLIC_ADMIN_URL) || clean(process.env.NEXTAUTH_URL) || ADMIN_FALLBACK;
}

/** The shop's absolute base URL, never empty and never "undefined". */
export function shopBase() {
  return clean(process.env.NEXT_PUBLIC_SHOP_URL) || clean(process.env.EFD_SHOP_URL) || SHOP_FALLBACK;
}

/** An absolute admin link. `adminLink('/dashboard/payroll')` — leading slash optional. */
export function adminLink(path = '') {
  const p = String(path || '');
  return p ? `${adminBase()}/${p.replace(/^\/+/, '')}` : adminBase();
}

/** An absolute shop link. */
export function shopLink(path = '') {
  const p = String(path || '');
  return p ? `${shopBase()}/${p.replace(/^\/+/, '')}` : shopBase();
}

/**
 * Deep link into a customer's custom-order portal — the REQUEST, on the RIGHT TAB.
 *
 * The portal already supports this: `?id=CO-…&tab=quote` restores that exact view (see
 * `TAB_SLUGS` / `tabIndexFromSlug` in efd-shop app/custom-work/portal/page.js). Admin was linking to the
 * bare portal root everywhere, so a customer clicking "your quote is ready" — in the app OR in the email
 * — landed on a list and had to find the request and the tab themselves. The feature existed; nothing
 * used it.
 *
 * @param {string} customID
 * @param {'overview'|'3d'|'moodboard'|'messages'|'quote'|'invoices'} tab
 */
export const PORTAL_TABS = ['overview', '3d', 'moodboard', 'messages', 'quote', 'invoices'];

export function portalLink(customID = '', tab = 'overview') {
  const base = `${shopBase()}/custom-work/portal`;
  if (!customID) return base;
  // An unknown slug would silently land on Overview, which is the bug this function exists to fix.
  const slug = PORTAL_TABS.includes(tab) ? tab : 'overview';
  return `${base}?id=${encodeURIComponent(customID)}&tab=${slug}`;
}
