/**
 * Pipeline C-5 — pure normalization for the `ppN-products-normalize` backfill
 * (0008 §5 / D5–D6). Kept dependency-free (no `@crittercodes/refrakt`, no DB) so the
 * migration script can import it under plain `node`, exactly like collectionsUnify.js
 * backs pp1. The runtime write path (productContract.normalizeProductWrite) applies
 * the same rules at write time; this module is the batch/idempotent equivalent used
 * to bring already-stored docs up to the 0004 contract.
 *
 * The three drifting product shapes (0008 §2.2) all live in ONE `products` collection;
 * this is a field-normalization backfill, not a collection move. It is ADDITIVE — no
 * deletes, no overwrite of a value that already satisfies the contract — so re-running
 * is a no-op (idempotent).
 */

export const PRODUCT_TYPES = ['gemstone', 'concept', 'jewelry'];
const ID_PREFIX = { gem: 'gemstone', jwl: 'jewelry', cpt: 'concept' };

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Infer productType for a doc missing it (0008 §5.1): from the `productId` prefix
 * (`gem_`→gemstone, `jwl_`→jewelry, `cpt_`→concept), else default `jewelry`
 * (0004 absent-handling / M4-T2).
 */
export function inferProductType(doc = {}) {
  if (PRODUCT_TYPES.includes(doc.productType)) return doc.productType;
  const pid = String(doc.productId || '');
  const prefix = pid.includes('_') ? pid.split('_')[0] : '';
  return ID_PREFIX[prefix] || 'jewelry';
}

/** Mint a canonical URL-safe string productId (matches productContract.generateProductId). */
export function mintProductId(productType, seed) {
  const prefix = { gemstone: 'gem', concept: 'cpt', jewelry: 'jwl' }[productType] || 'prd';
  const base = slugify(seed);
  const rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return base ? `${prefix}_${base}_${rand}` : `${prefix}_${rand}`;
}

/**
 * Compute the additive `$set` patch that brings a single stored product doc up to the
 * 0004 contract. Returns `{}` when the doc already satisfies every invariant (→ the
 * migration skips it, so re-runs are no-ops). Never removes or rewrites a conformant
 * value; only fills gaps (§5.1–5.5):
 *   1. productType — inferred when absent/invalid
 *   2. references.gemstoneId — gemstoneIds[0] when singular absent (D5); array retained
 *   3. runSize — left absent (§5.3: absent = unlimited; not fabricated)
 *   4. status — default 'draft' when absent (§5.4)
 *   5. productId — minted string when absent/non-URL-safe (§5.5 / D6)
 *
 * @param {object} doc a product document
 * @returns {{ set: Record<string, any>, changed: string[] }}
 */
export function computeProductNormalizePatch(doc = {}) {
  const set = {};
  const changed = [];

  // 1. productType
  if (!PRODUCT_TYPES.includes(doc.productType)) {
    set.productType = inferProductType(doc);
    changed.push('productType');
  }
  const productType = set.productType || doc.productType || 'jewelry';

  // 5. productId (string, URL-safe) — needed before it can seed nothing else, but grouped last in spec
  if (!doc.productId || !/^[A-Za-z0-9_-]+$/.test(String(doc.productId))) {
    set.productId = mintProductId(productType, doc.title || doc.name);
    changed.push('productId');
  }

  // 2. references.gemstoneId (singular, D5) — only when a legacy array carries one and the singular is absent
  const refs = doc.references || {};
  const arr = Array.isArray(refs.gemstoneIds) ? refs.gemstoneIds.filter(Boolean) : [];
  if ((refs.gemstoneId == null) && arr.length > 0) {
    set['references.gemstoneId'] = arr[0];
    changed.push('references.gemstoneId');
  }

  // 4. status
  if (doc.status == null || doc.status === '') {
    set.status = 'draft';
    changed.push('status');
  }

  // 3. runSize — intentionally untouched (absent → unlimited)

  return { set, changed };
}
