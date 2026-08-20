/**
 * Affiliate code format — shared by every writer of `affiliates.code`.
 *
 * The code is a URL path segment (shop /r/<code>/<campaign>) and a query param (?ref=).
 * Untyped, an affiliate could set '', whitespace, slashes, or unicode and break every
 * printed link — or squat a misleading string. 3–30 chars, lowercase alnum + hyphens.
 */
export const AFFILIATE_CODE_RX = /^[a-z0-9][a-z0-9-]{2,29}$/;
