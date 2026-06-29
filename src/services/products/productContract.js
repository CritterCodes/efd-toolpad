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
import { VALID_FINISHES, VALID_GEM_PRESETS } from '@crittercodes/refrakt';

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

  return { valid: errors.length === 0, errors };
}

/** Build a contract-shaped draft product from a finished Piece. */
export function buildProductFromPiece({ piece, design = null, opts = {} }) {
  const cogs = Number(piece?.totalCOGS) || 0;
  const title = opts.title || design?.name || 'Untitled Piece';
  const productId = opts.productId || `${slugify(title)}-${randomUUID().slice(0, 6)}`;
  const availability = opts.availability || (piece?.status === 'available' ? 'ready-to-ship' : 'made-to-order');

  return {
    productId,
    productType: 'jewelry',
    title,
    description: opts.description ?? design?.description ?? '',
    availability,
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
    references: { designId: piece?.designID ?? null, pieceID: piece?.pieceID ?? null },
    pieceIDs: piece?.pieceID ? [piece.pieceID] : [],
    seller: opts.seller ?? null,
    images: Array.isArray(opts.images) ? opts.images : [],
    viewer: opts.viewer ?? null,
    publishing: { visible: false, featured: false, publishedAt: null },
    createdBy: opts.createdBy ?? null,
  };
}
