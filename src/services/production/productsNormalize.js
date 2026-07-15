/**
 * Products normalization (Pipeline PP-C5). Pure mapping helpers shared by the
 * `pp2-products-normalize` migration and any admin/backfill callers. No DB
 * access — the migration reads/writes; these compute the storefront-contract
 * shape from an existing legacy `products` doc.
 *
 * Contract: docs/manufacturing/product-page-data-contract.md +
 * docs/manufacturing/data-model.md (products §, decisions 0004/D5).
 *
 * Transforms applied here:
 *   1. `productType` — inferred from `productId` prefix when absent; else `jewelry`
 *      (contract §2.1: absent `productType` ≡ jewelry).
 *   2. `references.gemstoneId` — singular field required by decisions 0004/D5.
 *      Backfilled from the FIRST entry of the legacy plural `references.gemstoneIds`.
 *      Only when the target product is NOT itself a gemstone (a loose stone
 *      doesn't reference another loose stone).
 *   3. `status` — default `'draft'` when the doc has neither `status` nor
 *      `isPublic` (visibility §1). Existing values are preserved.
 *   4. `productId` — the storefront URL handle MUST be a string. Legacy docs
 *      that carry only a Mongo `_id` are surfaced for repair; we do NOT
 *      fabricate a handle here (product IDs are user-visible URLs).
 *
 * Deliberately NOT changed:
 *   - `runSize`. Contract §2.1: absent `runSize` ≡ `unlimited` (a made-to-order
 *     posture, not an inventory count). Fabricating a `runSize` would flip
 *     historically uncapped products into an edition — data-losing. Leave absent.
 */

const PRODUCT_TYPES = Object.freeze({
  GEMSTONE: 'gemstone',
  JEWELRY: 'jewelry',
});

const PREFIX_MAP = Object.freeze({
  gem: PRODUCT_TYPES.GEMSTONE,
  jwl: PRODUCT_TYPES.JEWELRY,
  concept: PRODUCT_TYPES.JEWELRY,
});

/**
 * Infer `productType` from a `productId` handle. Live create routes mint
 * `gem_*` (gemstones) and `jwl_*` (jewelry); retired speculative prefixes normalize
 * to jewelry. Any other prefix (or a missing id) falls through to
 * `jewelry` — the contract's default for absent `productType`.
 * @param {string|null|undefined} productId
 * @returns {'gemstone'|'jewelry'}
 */
export function inferProductType(productId) {
  if (typeof productId === 'string') {
    const [prefix] = productId.split('_', 1);
    if (prefix && Object.prototype.hasOwnProperty.call(PREFIX_MAP, prefix)) {
      return PREFIX_MAP[prefix];
    }
  }
  return PRODUCT_TYPES.JEWELRY;
}

/**
 * Read the legacy plural `references.gemstoneIds`, coerce to a de-duped list
 * of non-empty string ids. Returns `[]` if the field is missing or unusable.
 */
export function legacyGemstoneIds(doc = {}) {
  const raw = doc?.references?.gemstoneIds;
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Compute the normalization patch for a single legacy `products` doc.
 * Returns a `$set`-ready object of ONLY the fields that need to change
 * (dot-notation for nested `references.gemstoneId`), so re-runs against
 * already-normalized docs produce an empty patch — the migration's
 * idempotency guarantee.
 *
 * @param {Record<string, unknown>} doc — a Mongo `products` doc as read.
 * @returns {{ patch: Record<string, unknown>, skipped: string[] }}
 *   `patch` — `$set` fields (may be empty).
 *   `skipped` — reasons a field could not be normalized (e.g. missing productId).
 */
export function normalizeProduct(doc = {}) {
  const patch = {};
  const skipped = [];

  const productId = doc?.productId;
  const hasStringProductId = typeof productId === 'string' && productId.length > 0;

  if (!hasStringProductId) {
    // Never fabricate a URL handle in a backfill — leave it for the owner.
    skipped.push('missing productId (needs manual repair; url handle not fabricated)');
  }

  const inferred = inferProductType(hasStringProductId ? productId : null);
  if (!doc.productType || !Object.values(PRODUCT_TYPES).includes(doc.productType)) {
    patch.productType = inferred;
  }

  const isGemstone = (doc.productType || inferred) === PRODUCT_TYPES.GEMSTONE;
  const currentSingular = doc?.references?.gemstoneId;
  if (!isGemstone && !currentSingular) {
    const [firstId] = legacyGemstoneIds(doc);
    if (firstId) {
      patch['references.gemstoneId'] = firstId;
    }
  }

  const hasStatus = typeof doc.status === 'string' && doc.status.length > 0;
  const hasIsPublic = typeof doc.isPublic === 'boolean';
  if (!hasStatus && !hasIsPublic) {
    patch.status = 'draft';
  }

  // §5.3: runSize is DELIBERATELY left absent. Do not synthesize.

  return { patch, skipped };
}

export const PRODUCTS_NORMALIZE = Object.freeze({
  PRODUCT_TYPES,
  PREFIX_MAP,
});
