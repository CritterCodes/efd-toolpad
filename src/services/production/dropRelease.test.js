import { describe, it, expect } from 'vitest';
import { designReleaseReadiness, parseReleaseAt } from './dropRelease';

const activeVariant = (over = {}) => ({
  variantId: 'v1', sku: 'SKU-1', active: true, pricing: { retailPrice: 1200 }, ...over,
});
const product = (over = {}) => ({ images: [{ url: 'https://cdn/x.jpg' }], ...over });

describe('designReleaseReadiness', () => {
  it('passes a design with an active, priced variant and media', () => {
    const r = designReleaseReadiness(
      { designID: 'd1', name: 'Tracks Band', variants: [activeVariant()] },
      { product: product() },
    );
    expect(r.eligible).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it('blocks the REFRAKT stub case: variants exist but none is active', () => {
    // The studio creates variants with active:false; nothing else surfaced that, so a design
    // looked finished and listed empty. This is the reason string the owner needs to see.
    const r = designReleaseReadiness(
      { designID: 'd1', name: 'Tracks Band', variants: [activeVariant({ active: false })] },
      { product: product() },
    );
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/no ACTIVE variant \(1 inactive\)/);
  });

  it('blocks a design with no variants at all', () => {
    const r = designReleaseReadiness({ designID: 'd1', name: 'Blossom Ring', variants: [] }, { product: product() });
    expect(r.eligible).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/no variants/);
  });

  it('blocks a design whose price cannot be computed, and accepts a price from any source', () => {
    // "Unpriced" is fine — release computes variant retail from the day's metal. "Unpriceable"
    // (no STL volume / no metal) is the real blocker.
    const base = { designID: 'd1', name: 'X', variants: [activeVariant({ pricing: {} })] };
    expect(designReleaseReadiness(base, { product: product() }).reasons.join(' ')).toMatch(/cannot compute a price/);
    // flat variant price
    expect(designReleaseReadiness(
      { ...base, variants: [activeVariant({ pricing: {}, price: 900 })] }, { product: product() },
    ).eligible).toBe(true);
    // an existing listing price (e.g. a consigned sheet price) counts
    expect(designReleaseReadiness(base, { product: product({ pricing: { retailPrice: 675 } }) }).eligible).toBe(true);
  });

  it('accepts a jewelry design that is unpriced but PRICEABLE (release computes it)', () => {
    // This is the deadlock that kept "Tracks Band" dark: the daily repricer only prices
    // listings the shop can already see, so a design on its way live never had a price.
    const r = designReleaseReadiness({
      designID: 'd1', name: 'Tracks Band', category: 'ring', stlVolumeCm3: 0.795,
      designModel: { glbUrl: 'https://cdn/x.glb' },
      variants: [activeVariant({ pricing: { retailPrice: null }, metalKey: 'GOLD_14K_YELLOW' })],
    }, { product: null });
    expect(r.eligible).toBe(true);
  });

  it('accepts a gemstone design priced by rate tiers instead of a flat price', () => {
    const r = designReleaseReadiness({
      designID: 'g1', name: 'Star of Inanna', category: 'gemstone',
      variants: [activeVariant({
        pricing: {},
        gemstone: { species: 'Sapphire', colors: [{ label: 'blue', rates: [{ upToCt: 3, ratePerCarat: 200 }] }] },
      })],
    }, { product: product() });
    expect(r.eligible).toBe(true);
  });

  it('blocks a design with no media, and accepts a GLB as media', () => {
    const d = { designID: 'd1', name: 'X', variants: [activeVariant()] };
    expect(designReleaseReadiness(d, { product: { images: [] } }).reasons.join(' ')).toMatch(/no media/);
    expect(designReleaseReadiness({ ...d, designModel: { glbUrl: 'https://cdn/x.glb' } }, { product: null }).eligible).toBe(true);
  });

  it('reports every blocker at once, not just the first', () => {
    const r = designReleaseReadiness({ designID: 'd1', name: 'X', variants: [] }, { product: null });
    expect(r.reasons.length).toBe(2); // no variants + no media
  });
});

describe('parseReleaseAt', () => {
  it('accepts the datetime-local string the drop form actually posts', () => {
    // Stored raw, this string compared as TEXT and the cron could never tell a drop was due.
    const d = parseReleaseAt('2026-09-11T15:10');
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
  it('passes a Date through and rejects junk/empty', () => {
    const now = new Date();
    expect(parseReleaseAt(now)).toBe(now);
    expect(parseReleaseAt(null)).toBeNull();
    expect(parseReleaseAt('')).toBeNull();
    expect(parseReleaseAt('not a date')).toBeNull();
    expect(parseReleaseAt(new Date('nope'))).toBeNull();
  });
});

describe('shouldMaterializeListing', () => {
  it('never mints a listing for a design nobody asked to list (custom orders)', async () => {
    const { shouldMaterializeListing } = await import('./listingSync');
    // A custom order spawns a private one-off design; the sweep once minted 8 of these.
    expect(shouldMaterializeListing({ designID: 'd1', name: 'Custom CO-abc', status: 'cad' })).toBe(false);
    // …but an explicit "list this design" does.
    expect(shouldMaterializeListing({ designID: 'd1' }, { create: true })).toBe(true);
    // …and anything already listed, or carrying a publish block, keeps syncing.
    expect(shouldMaterializeListing({ designID: 'd1', primaryProductId: 'p1' })).toBe(true);
    expect(shouldMaterializeListing({ designID: 'd1', productID: 'p1' })).toBe(true);
    expect(shouldMaterializeListing({ designID: 'd1', listing: { published: false } })).toBe(true);
  });
});

describe('shop drop page projection', () => {
  it('builds the shape efd-shop reads (kind drop, released, ordered members)', async () => {
    const { buildDropReadModel, orderDropMembers } = await import('./dropRelease');
    const drop = { dropId: 'd-1', slug: 'fall-drop', name: 'Fall Drop', description: 'x', heroImage: 'h.jpg', ownerType: 'efd' };
    const doc = buildDropReadModel({ drop, members: ['p1', 'p2'] });
    expect(doc.collectionId).toBe('drop-d-1');
    expect(doc.slug).toBe('fall-drop');
    expect(doc.kind).toBe('drop');      // the shop's Drops tab filters on this
    expect(doc.status).toBe('released'); // the shop's visibility test
    expect(doc.members).toEqual([{ productId: 'p1', position: 0 }, { productId: 'p2', position: 1 }]);
    expect(doc.projection.dropId).toBe('d-1');
  });

  it('honours the curated designOrder and appends anything not in it', async () => {
    const { orderDropMembers } = await import('./dropRelease');
    const published = [
      { designID: 'a', productId: 'pa' }, { designID: 'b', productId: 'pb' }, { designID: 'c', productId: 'pc' },
    ];
    expect(orderDropMembers({ designOrder: ['c', 'a'], published })).toEqual(['pc', 'pa', 'pb']);
    expect(orderDropMembers({ designOrder: [], published })).toEqual(['pa', 'pb', 'pc']);
  });

  it('skips designs that failed to publish', async () => {
    const { orderDropMembers } = await import('./dropRelease');
    const published = [{ designID: 'a', productId: 'pa' }, { designID: 'b', productId: null }];
    expect(orderDropMembers({ designOrder: ['a', 'b'], published })).toEqual(['pa']);
  });
});
