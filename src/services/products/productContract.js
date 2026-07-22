/**
 * Product contract (S5) — build + validate products against the efd-shop
 * product-page data contract (docs/manufacturing/product-page-data-contract.md).
 *
 * The `products` collection is shared with the storefront, which reads documents
 * directly. `buildProductFromPiece` turns a finished Piece into a contract-shaped
 * draft product with `pricing.costBasis` = the piece's COGS (the storefront strips
 * costBasis). `validateProductContract` enforces the contract §8 checklist before
 * publish.
 */
import { randomUUID } from 'crypto';
import { VALID_FINISHES, VALID_GEM_PRESETS } from '@crittercodes/refrakt/server';

// Material vocabulary is owned by the engine package (refrakt ≥1.2). These are the
// VALIDATION supersets (incl. cuts like `marquise`) — re-exported under the historical
// names so every `.includes()` call site keeps working from one source of truth. UI
// pickers must use the package's curated METALS/GEMS instead (not these). See
// docs/REFRAKT_1.2_VOCAB_HANDOFF.md.
export const METAL_FINISHES = VALID_FINISHES;
export const GEM_PRESETS = VALID_GEM_PRESETS;
export const AVAILABILITY = ['ready-to-ship', 'made-to-order'];

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'piece';
}

/** Suggested retail from COGS (default 2.5× keystone-ish markup). */
export function suggestedRetailFromCOGS(cogs, markup = 2.5) {
  return round((Number(cogs) || 0) * markup);
}

export const RUN_SIZE_TYPES = ['one_of_one', 'limited', 'unlimited'];

/**
 * Normalize a run-size spec and derive the shop-read `remaining` from how many
 * backing pieces have been produced. Run size is a PRODUCTION CAP, not stock
 * (see data-model.md): `remaining = size − produced`, floored at 0, present for
 * capped editions only. Absent / unknown / a `limited` with no valid size → an
 * uncapped `unlimited` run (no `size`/`remaining`).
 * @returns {{ type: string, size?: number, remaining?: number }}
 */
export function normalizeRunSize(input = null, producedCount = 0) {
  const produced = Math.max(0, Math.floor(Number(producedCount) || 0));
  const type = input?.type;
  if (type === 'one_of_one') {
    return { type: 'one_of_one', size: 1, remaining: Math.max(0, 1 - produced) };
  }
  if (type === 'limited') {
    const size = Math.floor(Number(input?.size));
    if (Number.isFinite(size) && size >= 1) {
      return { type: 'limited', size, remaining: Math.max(0, size - produced) };
    }
  }
  return { type: 'unlimited' };
}

/**
 * Validate a product document against the storefront contract §8.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProductContract(doc = {}) {
  const errors = [];

  if (!doc.productId || !/^[A-Za-z0-9_-]+$/.test(String(doc.productId))) {
    errors.push('productId is required and must be URL-safe');
  }
  if (!doc.title) errors.push('title is required');
  if (!['gemstone', 'jewelry'].includes(doc.productType ?? 'jewelry')) errors.push('productType must be gemstone or jewelry');

  const price = doc?.pricing?.retailPrice ?? doc.price;
  if (typeof price !== 'number' || Number.isNaN(price)) {
    errors.push('pricing.retailPrice (or price) must be a number');
  }

  const availability = doc.availability ?? doc.listingType;
  if (!AVAILABILITY.includes(availability)) {
    errors.push(`availability must be one of: ${AVAILABILITY.join(', ')}`);
  }

  if (doc.viewer) {
    if (!doc.viewer.glbUrl) errors.push('viewer.glbUrl is required when viewer is present');
    if (!Array.isArray(doc.viewer.meshMap) || doc.viewer.meshMap.length === 0) {
      errors.push('viewer.meshMap must be a non-empty array');
    } else {
      doc.viewer.meshMap.forEach((slot, i) => {
        if (slot.type === 'metal' && !METAL_FINISHES.includes(slot.finish)) {
          errors.push(`meshMap[${i}]: metal slot needs a valid finish`);
        }
        if (slot.type === 'gem' && !slot.gemPreset && !slot.ior) {
          errors.push(`meshMap[${i}]: gem slot needs a gemPreset or custom params`);
        }
        if (slot.type === 'gem' && slot.gemPreset && !GEM_PRESETS.includes(slot.gemPreset)) {
          errors.push(`meshMap[${i}]: invalid gemPreset "${slot.gemPreset}"`);
        }
      });
    }
  }

  const hasImages = Array.isArray(doc.images) && doc.images.length > 0;
  if (!doc.viewer && !hasImages) {
    errors.push('at least one of viewer or images is required');
  }

  if ((doc.productType ?? 'jewelry') === 'jewelry' && doc.designId) {
    const active = (doc.variants || []).filter((variant) => variant.active);
    if (active.length === 0) errors.push('Design-backed jewelry requires an active variant');
    if (active.length > 1 && !active.some((variant) => variant.variantId === doc.defaultVariantId)) errors.push('defaultVariantId must resolve to an active variant');
    active.forEach((variant, index) => {
      if (!variant.variantId || !variant.sku || typeof variant?.pricing?.retailPrice !== 'number') errors.push(`variants[${index}] requires variantId, sku, and numeric retail price`);
      if (doc?.jewelry?.type === 'ring' && (variant.ringSize === undefined || variant.ringSize === null || variant.ringSize === '')) errors.push(`variants[${index}] requires one nominal ringSize`);
      if (variant.sizingAllowance && Number(variant.sizingAllowance.min) > Number(variant.sizingAllowance.max)) errors.push(`variants[${index}] sizingAllowance min must not exceed max`);
    });
  }
  if (doc.edition) {
    const { type, limit, allocated = 0, committed = 0, remaining } = doc.edition;
    const cap = type === 'one_of_one' ? 1 : limit;
    if (!['one_of_one', 'limited', 'unlimited'].includes(type)) errors.push('invalid edition type');
    if (type === 'limited' && (!Number.isInteger(limit) || limit < 1)) errors.push('limited edition requires a positive integer limit');
    if (type !== 'unlimited' && (allocated + committed > cap || remaining !== cap - allocated - committed)) errors.push('edition counters are inconsistent');
  }

  return { valid: errors.length === 0, errors };
}

/** Build a contract-shaped draft product from a finished Piece. */
export function buildProductFromPiece({ piece, design = null, opts = {} }) {
  const cogs = Number(piece?.totalCOGS) || 0;
  const title = opts.title || design?.name || 'Untitled Piece';
  const productId = opts.productId || `${slugify(title)}-${randomUUID().slice(0, 6)}`;
  const pieceIDs = piece?.pieceID ? [piece.pieceID] : [];
  // Run size is optional (absent → the storefront treats the listing as unlimited).
  // When provided, derive `remaining` from the count of backing pieces produced so far.
  const runSize = opts.runSize ? normalizeRunSize(opts.runSize, pieceIDs.length) : null;
  const availability = opts.availability
    || (runSize?.type === 'unlimited'
      ? 'made-to-order'
      : (piece?.status === 'available' ? 'ready-to-ship' : 'made-to-order'));

  return {
    productId,
    productType: opts.productType || 'jewelry',
    title,
    description: opts.description ?? design?.description ?? '',
    availability,
    ...(runSize ? { runSize } : {}),
    status: 'draft',
    pricing: {
      retailPrice: opts.retailPrice ?? suggestedRetailFromCOGS(cogs),
      compareAtPrice: opts.compareAtPrice ?? null,
      costBasis: cogs, // storefront strips this
      currency: 'USD',
    },
    jewelry: {
      type: opts.jewelryType ?? null,
      metals: piece?.metalType ? [{ type: piece.metalType, purity: piece.karat ?? null }] : [],
    },
    references: {
      designId: piece?.designID ?? null,
      pieceID: piece?.pieceID ?? null,
      // Thread the originating gemstone end-to-end (the flywheel; M1-T2). Piece wins,
      // else fall back to the design's gemstone.
      gemstoneId: piece?.gemstoneId ?? design?.gemstoneId ?? null,
    },
    pieceIDs: piece?.pieceID ? [piece.pieceID] : [],
    seller: opts.seller ?? null,
    images: Array.isArray(opts.images) ? opts.images : [],
    viewer: opts.viewer ?? null,
    publishing: { visible: false, featured: false, publishedAt: null },
    createdBy: opts.createdBy ?? null,
  };
}

/**
 * Build a contract-shaped made-to-order jewelry Product from a Design with no finished Piece.
 * Priced off a LIVE-metal
 * estimate — the caller passes `estCost` computed from current `metalPrices` — so
 * `pricing.costBasis` is the ESTIMATE and `pricing.costBasisSource` is `'estimated'`
 * until a Piece is produced + linked (which ripens it to jewelry/actual). The
 * gemstone thread is preserved via `references.gemstoneId` (the flywheel).
 */
export function buildProductFromDesign({ design = {}, estCost = 0, opts = {} }) {
  const cost = round(Number(estCost) || 0);
  const title = opts.title || design.name || 'Untitled Design';
  const productId = opts.productId || `${slugify(title)}-${randomUUID().slice(0, 6)}`;
  const runSize = opts.runSize ? normalizeRunSize(opts.runSize, 0) : null;
  const metals = Array.isArray(design.metalOptions)
    ? design.metalOptions.map((m) => (typeof m === 'string' ? { type: m, purity: null } : m))
    : [];
  // A gemstone Design (a cut stone) lists as a gemstone product carrying the gem-native spec,
  // not the jewelry metal shape. Cut/technique are DESIGN details (the cut IS the design); the
  // material spec (species/carat/…) lives per VARIANT — surface the first variant's as
  // representative.
  const isGem = design.category === 'gemstone';
  const gemSpec = isGem
    ? { ...(design.gemstone || {}), ...((design.variants || []).find((v) => v.gemstone)?.gemstone || {}) }
    : null;

  return {
    productId,
    productType: isGem ? 'gemstone' : 'jewelry',
    ...(isGem ? { listingType: 'gemstone' } : {}),
    title,
    description: opts.description ?? design.description ?? '',
    availability: 'made-to-order',
    ...(runSize ? { runSize } : {}),
    status: 'draft',
    pricing: {
      retailPrice: opts.retailPrice ?? design.suggestedRetail ?? suggestedRetailFromCOGS(cost),
      compareAtPrice: opts.compareAtPrice ?? null,
      costBasis: cost, // estimated; storefront strips this
      costBasisSource: 'estimated',
      currency: 'USD',
    },
    ...(isGem ? { gemstone: gemSpec } : { jewelry: { type: opts.jewelryType ?? null, metals } }),
    references: { designId: design.designID ?? null, pieceID: null, gemstoneId: design.gemstoneId ?? null },
    pieceIDs: [],
    seller: opts.seller ?? null,
    images: Array.isArray(opts.images) ? opts.images : [],
    viewer: opts.viewer ?? null,
    publishing: { visible: false, featured: false, publishedAt: null },
    createdBy: opts.createdBy ?? null,
  };
}

/**
 * Patch a made-to-order jewelry Product once a Piece is produced and linked.
 * `costBasis` flips from the live-metal ESTIMATE
 * to the Piece's ACTUAL COGS (`costBasisSource:'actual'`), `margin` is recorded, and
 * `runSize.remaining` re-derives from the backing pieces. Returns a `$set`-ready patch
 * (dot-notation for the nested `pricing`/`references` fields it touches).
 */
export function attachPieceToProduct({ product = {}, piece = {} }) {
  const cogs = round(Number(piece?.totalCOGS) || 0);
  const retail = Number(product?.pricing?.retailPrice) || 0;
  const pieceIDs = Array.from(new Set([...(product.pieceIDs || []), piece?.pieceID].filter(Boolean)));
  const runSize = product.runSize ? normalizeRunSize(product.runSize, pieceIDs.length) : null;
  const availability = runSize?.type === 'unlimited'
    ? 'made-to-order'
    : (piece?.status === 'available' ? 'ready-to-ship' : 'made-to-order');

  return {
    productType: 'jewelry',
    availability,
    ...(runSize ? { runSize } : {}),
    'pricing.costBasis': cogs,
    'pricing.costBasisSource': 'actual',
    'pricing.margin': round(retail - cogs),
    'references.pieceID': piece?.pieceID ?? null,
    pieceIDs,
  };
}
