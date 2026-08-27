import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The daily repricer writes prices to a LIVE storefront, so these tests are mostly about
 * what it REFUSES to do. A stale price costs margin; a wrong price computed from missing
 * inputs sells a ring for less than its own metal. Every guard below is that second case.
 */

let collections = {};
const updates = [];

function fakeCollection(name) {
  return {
    find: () => ({ toArray: async () => collections[name] || [] }),
    findOne: async () => (collections[name] || [])[0] || null,
    updateOne: async (filter, update, opts) => {
      updates.push({ collection: name, filter, update, opts });
      return { modifiedCount: 1 };
    },
  };
}

vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection: (n) => fakeCollection(n) })) },
}));
vi.mock('@/services/customs/customTasks', () => ({ getTaskSuggestions: vi.fn(async () => []) }));

let snapshotRates = { gold: 100, silver: 1, platinum: 40, palladium: 40 };
vi.mock('@/services/production/dailyMetalSnapshot', () => ({
  currentPriceDay: () => '2026-08-25',
  getDailyMetalSnapshot: vi.fn(async () => ({ priceDay: '2026-08-25', rates: snapshotRates, capturedAt: new Date(0) })),
}));

const { repriceListings, priceDesignVariants } = await import('@/services/production/dailyReprice');
const { estimateMetalCost } = await import('@/services/production/designCost');

const design = (over = {}) => ({
  designID: 'd1',
  category: 'jewelry',
  stlVolumeCm3: 4,
  productionMethod: 'handmade', // no auto casting-cleanup line, keeps the arithmetic obvious
  pricing: { markup: 2 },
  variants: [{ variantId: 'v1', active: true, metalKey: 'GOLD_14K_YELLOW', gemstones: [] }],
  ...over,
});

beforeEach(() => {
  updates.length = 0;
  snapshotRates = { gold: 100, silver: 1, platinum: 40, palladium: 40 };
  collections = {
    adminSettings: [{ financial: { cogMarkup: 2.5 } }],
    stoneSkus: [],
    users: [],
    products: [],
    designs: [],
    metalPriceSnapshots: [],
  };
});

describe('priceDesignVariants (the recipe)', () => {
  it('builds cog from mounting + stones + shared, then applies the markup', () => {
    const d = design({
      pricing: { markup: 2, shipping: [{ cost: 30, quantity: 1 }] },
      variants: [{
        variantId: 'v1', active: true, metalKey: 'GOLD_14K_YELLOW',
        gemstones: [{ qty: 2, unitCost: 25 }], // 50, no caratEach → no setting labor
      }],
    });
    const r = priceDesignVariants({ design: d, rates: snapshotRates, stoneCosts: {}, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    const mounting = estimateMetalCost({ volumeCm3: 4, metalKey: 'GOLD_14K_YELLOW', metalPrices: snapshotRates }).metalCost;

    expect(r.ok).toBe(true);
    const v = r.variants[0];
    expect(v.mounting).toBeCloseTo(mounting, 2);
    expect(v.stones).toBe(50);
    expect(v.sharedCosts).toBe(30);
    expect(v.cog).toBeCloseTo(mounting + 50 + 30, 2);
    expect(v.retail).toBeCloseTo((mounting + 50 + 30) * 2, 2);
  });

  it('a variant markup override beats the design markup', () => {
    const d = design({ variants: [{ variantId: 'v1', active: true, metalKey: 'GOLD_14K_YELLOW', markupOverride: 3 }] });
    const r = priceDesignVariants({ design: d, rates: snapshotRates, stoneCosts: {}, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    expect(r.variants[0].markup).toBe(3);
  });

  it('SKU-linked stones read the live catalog cost, not the stored one', () => {
    const d = design({
      variants: [{ variantId: 'v1', active: true, metalKey: 'GOLD_14K_YELLOW', gemstones: [{ qty: 1, stoneSkuId: 's1', unitCost: 10 }] }],
    });
    const r = priceDesignVariants({ design: d, rates: snapshotRates, stoneCosts: { s1: 99 }, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    expect(r.variants[0].stones).toBe(99); // the live 99, never the stale 10
  });

  it('REFUSES a design with no STL volume rather than pricing a ring without its metal', () => {
    const r = priceDesignVariants({ design: design({ stlVolumeCm3: 0 }), rates: snapshotRates, stoneCosts: {}, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/volume/i);
  });

  it('marks a variant unpriceable when its metal is unknown, without failing the others', () => {
    const d = design({
      variants: [
        { variantId: 'bad', active: true, metalKey: 'NOT_A_METAL' },
        { variantId: 'good', active: true, metalKey: 'GOLD_14K_YELLOW' },
      ],
    });
    const r = priceDesignVariants({ design: d, rates: snapshotRates, stoneCosts: {}, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    expect(r.variants.find((v) => v.variantId === 'bad').ok).toBe(false);
    expect(r.variants.find((v) => v.variantId === 'good').ok).toBe(true);
  });

  it('skips inactive variants', () => {
    const d = design({ variants: [{ variantId: 'v1', active: false, metalKey: 'GOLD_14K_YELLOW' }] });
    const r = priceDesignVariants({ design: d, rates: snapshotRates, stoneCosts: {}, taskCosts: {}, artisanFee: 0, defaultMarkup: 2.5 });
    expect(r.variants).toHaveLength(0);
  });
});

describe('repriceListings', () => {
  it('WRITES NOTHING when the day has no metal rates', async () => {
    snapshotRates = { gold: 0, silver: 0, platinum: 0, palladium: 0 };
    collections.products = [{ productId: 'p1', status: 'published', pricing: { retailPrice: 100, costBasis: 40, costBasisSource: 'actual' } }];
    const r = await repriceListings();
    expect(r.ok).toBe(false);
    expect(updates).toHaveLength(0); // the whole point — a zero rate must never zero a storefront
  });

  it('prices a MADE piece off its COGS and never rewrites that COGS', async () => {
    collections.products = [{
      productId: 'p1', status: 'published',
      pricing: { retailPrice: 100, costBasis: 400, costBasisSource: 'actual' },
    }];
    const r = await repriceListings();
    expect(r.updated).toBe(1);
    const set = updates[0].update.$set;
    expect(set['pricing.retailPrice']).toBe(1000); // 400 × 2.5 default markup
    // The money was already spent — rewriting it would falsify what the piece cost.
    expect(set).not.toHaveProperty('pricing.costBasis');
    expect(set).not.toHaveProperty('pricing.costBasisSource');
  });

  it('recomputes BOTH cost and price for a design-backed listing', async () => {
    collections.products = [{
      productId: 'p1', status: 'published', defaultVariantId: 'v1',
      references: { designId: 'd1' },
      pricing: { retailPrice: 1, costBasis: 1, costBasisSource: 'estimated' },
    }];
    collections.designs = [design()];
    const r = await repriceListings();
    expect(r.ok).toBe(true);

    const productSet = updates.find((u) => u.collection === 'products').update.$set;
    const mounting = estimateMetalCost({ volumeCm3: 4, metalKey: 'GOLD_14K_YELLOW', metalPrices: snapshotRates }).metalCost;
    expect(productSet['pricing.costBasis']).toBeCloseTo(mounting, 2);
    expect(productSet['pricing.retailPrice']).toBeCloseTo(mounting * 2, 2);
    expect(productSet['pricing.costBasisSource']).toBe('estimated');
  });

  it('writes the FLAT variant.price the storefront actually charges', async () => {
    collections.products = [{
      productId: 'p1', status: 'published', references: { designId: 'd1' },
      pricing: { retailPrice: 1, costBasisSource: 'estimated' },
    }];
    collections.designs = [design()];
    await repriceListings();

    const designUpdate = updates.find((u) => u.collection === 'designs');
    // resolveMtoVariant (shop) reads `variant.price`; the admin UI reads pricing.retailPrice.
    // Both must move together or the two surfaces disagree about the price.
    expect(designUpdate.update.$set['variants.$[v].price']).toBeGreaterThan(0);
    expect(designUpdate.update.$set['variants.$[v].pricing.retailPrice'])
      .toBe(designUpdate.update.$set['variants.$[v].price']);
    expect(designUpdate.opts.arrayFilters).toEqual([{ 'v.variantId': 'v1' }]);
  });

  it('prices a CUSTOMIZABLE listing (no variants) off the design base metal', async () => {
    // The configurator prices the real selection live; this only keeps the PDP headline
    // number from advertising last quarter's metal.
    collections.products = [{
      productId: 'p1', status: 'published', references: { designId: 'd1' },
      pricing: { retailPrice: 3950, costBasis: 1600, costBasisSource: 'estimated' },
    }];
    collections.designs = [design({ variants: [], metalOptions: ['GOLD_14K_YELLOW'], bom: {} })];
    const r = await repriceListings();
    expect(r.skipped).toHaveLength(0);
    expect(r.updated).toBe(1);
    expect(r.changes[0].kind).toBe('design-base');
    const set = updates[0].update.$set;
    expect(set['pricing.retailPrice']).toBeGreaterThan(0);
    expect(set['pricing.costBasisSource']).toBe('estimated');
  });

  it('reports a variantless design with no metal option rather than guessing one', async () => {
    collections.products = [{
      productId: 'p1', status: 'published', references: { designId: 'd1' },
      pricing: { retailPrice: 100, costBasisSource: 'estimated' },
    }];
    collections.designs = [design({ variants: [], metalOptions: [] })];
    const r = await repriceListings();
    expect(updates).toHaveLength(0);
    expect(r.skipped[0].reason).toMatch(/no metal option/i);
  });

  it('skips (and REPORTS) a listing it cannot price, leaving its price alone', async () => {
    collections.products = [{
      productId: 'p1', title: 'Volumeless ring', status: 'published',
      references: { designId: 'd1' }, pricing: { retailPrice: 900, costBasisSource: 'estimated' },
    }];
    collections.designs = [design({ stlVolumeCm3: 0 })];
    const r = await repriceListings();
    expect(updates).toHaveLength(0);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]).toMatchObject({ productId: 'p1' });
    expect(r.skipped[0].reason).toMatch(/volume/i);
  });

  it('reports a piece-backed listing with no recorded COGS instead of zeroing it', async () => {
    collections.products = [{ productId: 'p1', status: 'published', pricing: { retailPrice: 500, costBasisSource: 'actual' } }];
    const r = await repriceListings();
    expect(updates).toHaveLength(0);
    expect(r.skipped[0].reason).toMatch(/no recorded COGS/i);
  });

  it('does not churn a listing whose price has not moved', async () => {
    collections.products = [{
      productId: 'p1', status: 'published',
      pricing: { retailPrice: 1000, costBasis: 400, costBasisSource: 'actual' },
    }];
    const r = await repriceListings();
    expect(r.updated).toBe(0);
    expect(r.unchanged).toBe(1);
    expect(updates).toHaveLength(0);
  });

  it('dryRun reports the change without writing it', async () => {
    collections.products = [{
      productId: 'p1', status: 'published',
      pricing: { retailPrice: 100, costBasis: 400, costBasisSource: 'actual' },
    }];
    const r = await repriceListings({ dryRun: true });
    expect(r.updated).toBe(1);
    expect(r.changes[0]).toMatchObject({ productId: 'p1', from: 100, to: 1000 });
    expect(updates).toHaveLength(0);
  });
});
