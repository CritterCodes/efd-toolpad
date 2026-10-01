/**
 * /robots.txt — the admin app is staff-only, so no crawler is welcome anywhere (with the robots meta in
 * app/layout.js; checked after every deploy by scripts/ship-checks.mjs).
 */
export default function robots() {
  return { rules: { userAgent: '*', disallow: '/' } };
}
