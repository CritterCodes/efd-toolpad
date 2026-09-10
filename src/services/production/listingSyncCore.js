/**
 * Listing sync — the pure half (P1 of PRODUCTS_ARE_PROJECTIONS.md).
 *
 * Products are PROJECTIONS: nobody authors one. This module computes the $set that
 * brings an existing product doc in line with its Design + Pieces, via
 * `projectDesignProduct`. It is deliberately conservative about what it owns:
 *
 *   SYNCED (design/piece truth): productType, designId/references, defaultVariantId,
 *     variants (with offers), edition, availability, pieceIDs, viewer (when the design
 *     derives one), the gemstone/jewelry spec block (merged, never clobbering
 *     product-held facts the design doesn't know), and publish state — but only when
 *     the design carries a `listing` block.
 *
 *   NEVER TOUCHED (owned elsewhere): pricing/price (the daily repricer is the price
 *     author — §5.1; filled only when the product has no price at all), images/title/
 *     description (merchandising copy until the media move, §3.4), inventory +
 *     stripe ids (shop-owned counters, §5.3), seller/userId/vendor/custody/tags.
 *
 * Validation gate: a sync may never flip an invalid doc to published, and may never
 * touch a LIVE doc it would make invalid (it blocks instead).
 */
import { projectDesignProduct } from '@/services/production/productProjection';

/** Drop empty values (null/undefined/''/[]) so a merge never clobbers known facts with blanks. */
export function compact(obj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }));
}

/** Apply a (possibly dot-pathed) $set onto a clone of doc — enough fidelity to validate the result. */
export function applySet(doc = {}, set = {}) {
  const out = structuredClone(doc);
  for (const [path, value] of Object.entries(set)) {
    const parts = path.split('.');
    let node = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

const n = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

/**
 * Compute the sync for one design's listing.
 * @param {{ design: object, pieces?: object[], product: object,
 *           validate?: (doc: object) => { valid: boolean, errors: string[] } }} args
 * @returns {{ action: 'update'|'blocked', set?: object, wouldBe?: object,
 *             violations: string[], publishBlocked: boolean }}
 */
export function computeListingUpdate({ design, pieces = [], product = {}, validate = null }) {
  const projected = projectDesignProduct({ product, design, pieces });
  const livePieceIDs = pieces
    .filter((p) => !['scrapped', 'cancelled'].includes(p.status))
    .map((p) => p.pieceID);

  const set = {
    productType: projected.productType,
    designId: design.designID,
    'references.designId': design.designID,
    'references.gemstoneId': design.gemstoneId ?? null,
    defaultVariantId: projected.defaultVariantId,
    variants: projected.variants,
    edition: projected.edition,
    availability: projected.availability,
    pieceIDs: livePieceIDs,
    'references.pieceIDs': livePieceIDs,
  };

  // Price: the repricer is the author. Fill only a product that has no price at all
  // (first materialization); a manual/sheet price is never overwritten, and a null
  // projection (e.g. a rate-less consigned gem design) never nulls a real price.
  const existingPrice = n(product?.pricing?.retailPrice) ?? n(product?.price);
  if (!(existingPrice > 0) && n(projected.price) > 0) {
    set.price = projected.price;
    set['pricing.retailPrice'] = projected.price;
    if (projected.priceIsFrom) set['pricing.priceIsFrom'] = true;
  }

  // Viewer: only when the design actually derives one — never null out product media.
  if (projected.viewer) set.viewer = projected.viewer;

  // Spec block: design-derived facts win, but blanks never clobber product-held facts
  // (a consigned stone's carat/dimensions live on the product until the media/spec
  // move — the design shell doesn't know them and must not erase them).
  if (projected.productType === 'gemstone') {
    set.gemstone = { ...(product?.gemstone || {}), ...compact(projected.gemstone || {}) };
  } else {
    set.jewelry = { ...(product?.jewelry || {}), ...compact(projected.jewelry || {}) };
  }

  // Validate the would-be doc (contract §8) before any publish decision.
  const wouldBe = applySet(product, set);
  const validation = validate ? validate(wouldBe) : { valid: true, errors: [] };
  const violations = validation.errors || [];

  // Live-safety: never rewrite a currently-published listing into an invalid state.
  const isLive = product?.status === 'published' || product?.isPublic === true;
  if (isLive && !validation.valid) {
    return { action: 'blocked', violations, publishBlocked: false };
  }

  // Publish state maps from design.listing — the only human publish control (§3.2).
  // No listing block → publish state untouched (pre-P1 docs keep their status).
  let publishBlocked = false;
  const listing = design.listing;
  if (listing && typeof listing === 'object') {
    const wantPublished = listing.published === true;
    if (wantPublished && !validation.valid) {
      publishBlocked = true; // stays in its current state; violations are stamped below
    } else {
      const visible = wantPublished && listing.visible !== false;
      set.status = wantPublished ? 'published' : 'draft';
      set.isPublic = visible;
      set['publishing.visible'] = visible;
      set['publishing.featured'] = listing.featured === true;
      if (wantPublished && !product?.publishing?.publishedAt) {
        set['publishing.publishedAt'] = listing.publishedAt ? new Date(listing.publishedAt) : new Date();
      }
      if (!wantPublished) set['publishing.publishedAt'] = null;
    }
  }

  set['projection.engine'] = 'listingSync@1';
  set['projection.syncedAt'] = new Date();
  set['projection.contractViolations'] = violations;

  return { action: 'update', set, wouldBe, violations, publishBlocked };
}
