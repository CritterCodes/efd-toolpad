import { describe, it, expect } from 'vitest';
import { computeListingUpdate, compact, applySet } from './listingSyncCore';
import { validateProductContract } from '@/services/products/productContract';

/** A consigned one-off gem design + piece + product, in the shapes the backfill created. */
function gemFixture() {
  const design = {
    designID: 'design-1',
    name: 'Blue Zircon',
    category: 'gemstone',
    gemstone: { cut: [], cutStyle: [] },
    gemstoneId: null,
    primaryArtisanId: 'user-cutter',
    primaryProductId: 'gem_1',
    edition: { type: 'one_of_one', allocated: 1, committed: 0, nextNumber: 2 },
    variants: [{
      variantId: 'var-1', sku: 'CNSGN-1', label: 'Blue Zircon', active: true,
      gemstone: { species: 'Zircon', availability: 'special_request', colors: [] },
    }],
  };
  const piece = { pieceID: 'piece-1', designID: 'design-1', variantId: 'var-1', status: 'available' };
  const product = {
    productId: 'gem_1',
    productType: 'gemstone',
    title: 'Blue Zircon',
    status: 'draft',
    isPublic: false,
    pricing: { retailPrice: 675, costBasis: null, currency: 'USD' },
    gemstone: { species: 'Zircon', carat: 2.3, dimensions: { length: 8, width: 6, height: 4 }, color: ['blue'] },
    images: [{ id: 'img1', url: 'https://cdn/x.jpg', key: 'k' }],
    inventory: { quantity: 1, reserved: 0, available: 1 },
    references: { gemstoneIds: [] },
  };
  return { design, piece, product };
}

describe('computeListingUpdate', () => {
  it('emits a ready-to-ship offer from an available piece', () => {
    const { design, piece, product } = gemFixture();
    const { action, set } = computeListingUpdate({ design, pieces: [piece], product });
    expect(action).toBe('update');
    expect(set.availability).toBe('ready-to-ship');
    expect(set.variants[0].offers.readyToShip).toEqual({ quantity: 1, pieceIDs: ['piece-1'] });
    expect(set.pieceIDs).toEqual(['piece-1']);
  });

  it('drops the offer when the piece is sold and excludes scrapped pieces from pieceIDs', () => {
    const { design, piece, product } = gemFixture();
    const sold = { ...piece, status: 'sold' };
    const scrapped = { pieceID: 'piece-2', designID: 'design-1', variantId: 'var-1', status: 'scrapped' };
    const { set } = computeListingUpdate({ design, pieces: [sold, scrapped], product });
    expect(set.variants[0].offers.readyToShip).toBeUndefined();
    expect(set.pieceIDs).toEqual(['piece-1']);
  });

  it('never overwrites an existing price with a null/absent projection price', () => {
    const { design, piece, product } = gemFixture(); // rate-less gem design → no from-price
    const { set } = computeListingUpdate({ design, pieces: [piece], product });
    expect(set.price).toBeUndefined();
    expect(set['pricing.retailPrice']).toBeUndefined();
  });

  it('fills the price only when the product has none and the projection prices', () => {
    const { design, piece, product } = gemFixture();
    design.variants[0].gemstone = {
      species: 'Zircon', availability: 'purchase', caratMin: 1, caratMax: 2,
      cutLaborCost: 50, yield: 0.25,
      colors: [{ label: 'blue', rates: [{ upToCt: 2, ratePerCarat: 100 }] }],
    };
    const priceless = { ...product, pricing: { ...product.pricing, retailPrice: 0 } };
    const { set } = computeListingUpdate({ design, pieces: [piece], product: priceless });
    expect(set['pricing.retailPrice']).toBeGreaterThan(0);
    expect(set['pricing.priceIsFrom']).toBe(true);
    // …and with a real price present, the same projection does not touch it
    const { set: set2 } = computeListingUpdate({ design, pieces: [piece], product });
    expect(set2['pricing.retailPrice']).toBeUndefined();
  });

  it('merges the gemstone block without clobbering product-held facts (carat, dimensions)', () => {
    const { design, piece, product } = gemFixture();
    const { set } = computeListingUpdate({ design, pieces: [piece], product });
    expect(set.gemstone.carat).toBe(2.3);
    expect(set.gemstone.dimensions).toEqual({ length: 8, width: 6, height: 4 });
    expect(set.gemstone.species).toBe('Zircon');
  });

  it('leaves publish state alone when the design has no listing block', () => {
    const { design, piece, product } = gemFixture();
    const { set } = computeListingUpdate({ design, pieces: [piece], product });
    expect(set.status).toBeUndefined();
    expect(set.isPublic).toBeUndefined();
  });

  it('maps design.listing to publish state when the doc passes the contract', () => {
    const { design, piece, product } = gemFixture();
    design.listing = { published: true, visible: true };
    const { set, publishBlocked } = computeListingUpdate({
      design, pieces: [piece], product, validate: validateProductContract,
    });
    expect(publishBlocked).toBe(false);
    expect(set.status).toBe('published');
    expect(set.isPublic).toBe(true);
    expect(set['publishing.publishedAt']).toBeInstanceOf(Date);
  });

  it('refuses to publish an invalid doc (publishBlocked), but still syncs the rest', () => {
    const { design, piece, product } = gemFixture();
    design.listing = { published: true };
    const invalid = { ...product, images: [], viewer: null }; // no media → §8 violation
    const { set, publishBlocked, violations } = computeListingUpdate({
      design, pieces: [piece], product: invalid, validate: validateProductContract,
    });
    expect(publishBlocked).toBe(true);
    expect(set.status).toBeUndefined();
    expect(violations.length).toBeGreaterThan(0);
    expect(set.variants).toBeDefined();
  });

  it('blocks entirely rather than rewriting a LIVE listing into an invalid state', () => {
    const { design, piece, product } = gemFixture();
    const live = { ...product, status: 'published', isPublic: true, images: [], viewer: null };
    const { action, violations } = computeListingUpdate({
      design, pieces: [piece], product: live, validate: validateProductContract,
    });
    expect(action).toBe('blocked');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('unpublishing via listing.published:false maps to a hidden draft', () => {
    const { design, piece, product } = gemFixture();
    design.listing = { published: false };
    const { set } = computeListingUpdate({ design, pieces: [piece], product, validate: validateProductContract });
    expect(set.status).toBe('draft');
    expect(set.isPublic).toBe(false);
    expect(set['publishing.publishedAt']).toBeNull();
  });

  it('stamps projection metadata and never touches shop-owned fields', () => {
    const { design, piece, product } = gemFixture();
    const { set } = computeListingUpdate({ design, pieces: [piece], product });
    expect(set['projection.engine']).toBe('listingSync@1');
    expect(set['projection.syncedAt']).toBeInstanceOf(Date);
    const touched = Object.keys(set);
    for (const owned of ['inventory', 'stripeProductId', 'stripePriceId', 'images', 'title', 'description', 'seller', 'custody', 'tags']) {
      expect(touched.some((k) => k === owned || k.startsWith(`${owned}.`))).toBe(false);
    }
  });
});

describe('helpers', () => {
  it('compact drops blanks but keeps real values', () => {
    expect(compact({ a: '', b: null, c: [], d: 0, e: 'x', f: ['y'] })).toEqual({ d: 0, e: 'x', f: ['y'] });
  });
  it('applySet handles dotted paths without mutating the source', () => {
    const doc = { pricing: { retailPrice: 1 } };
    const out = applySet(doc, { 'pricing.costBasis': 2, status: 'draft' });
    expect(out.pricing).toEqual({ retailPrice: 1, costBasis: 2 });
    expect(out.status).toBe('draft');
    expect(doc.pricing.costBasis).toBeUndefined();
  });
});
