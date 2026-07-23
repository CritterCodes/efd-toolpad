import { describe, expect, it } from 'vitest';
import { estimateMetalCost, estimateDesignCost, estimateGemstoneCost, gemTierRate, gemstoneFromPrice, publicGemstoneSpec } from '@/services/production/designCost';
import { validateDesign, EDITION_TYPE, PRODUCTION_METHOD } from '@/app/api/designs/model';

describe('estimateMetalCost', () => {
  it('computes 14k yellow gold metal cost from volume', () => {
    // 1 cm³ wax → 1 g wax → 13.07 g gold (sg). 24k @ $60/g → 14k = 60*14/24 = $35/g.
    // metal cost = 13.07 * 35 * 1.3 (casting) = 594.685
    const r = estimateMetalCost({ volumeCm3: 1.0, metalKey: 'GOLD_14K_YELLOW', metalPrices: { gold: 60 } });
    expect(r.waxWeightG).toBeCloseTo(1.0, 2);
    expect(r.metalWeightG).toBeCloseTo(13.07, 2);
    expect(r.pricePerGram).toBeCloseTo(35, 2);
    expect(r.metalCost).toBeCloseTo(594.69, 1);
  });

  it('adjusts sterling silver by purity', () => {
    // 2 cm³ → 2 g wax → 20.8 g silver. .999 @ $0.80/g → sterling = 0.80 * 0.925 = $0.74/g.
    // metal cost = 20.8 * 0.74 * 1.3 = 20.0096
    const r = estimateMetalCost({ volumeCm3: 2.0, metalKey: 'SILVER_STERLING', metalPrices: { silver: 0.8 } });
    expect(r.metalWeightG).toBeCloseTo(20.8, 2);
    expect(r.pricePerGram).toBeCloseTo(0.74, 4);
    expect(r.metalCost).toBeCloseTo(20.01, 1);
  });

  it('throws on an unknown metal', () => {
    expect(() => estimateMetalCost({ volumeCm3: 1, metalKey: 'UNOBTANIUM', metalPrices: {} })).toThrow();
  });

  it('yields zero cost when the metal price is missing', () => {
    const r = estimateMetalCost({ volumeCm3: 1, metalKey: 'GOLD_14K_YELLOW', metalPrices: {} });
    expect(r.metalCost).toBe(0);
  });
});

describe('estimateDesignCost', () => {
  it('aggregates metal + stones + findings + labor', () => {
    const r = estimateDesignCost({
      stlVolumeCm3: 1.0,
      metalKey: 'GOLD_14K_YELLOW',
      metalPrices: { gold: 60 },
      bom: {
        stones: [{ estUnitCost: 100, qty: 2 }],     // 200
        findings: [{ estUnitCost: 5, qty: 4 }],      // 20
      },
      estLaborHours: 3,
      laborRate: 20,                                  // 60
    });
    expect(r.stonesCost).toBeCloseTo(200, 2);
    expect(r.findingsCost).toBeCloseTo(20, 2);
    expect(r.laborCost).toBeCloseTo(60, 2);
    // material = metalCost(594.69) + 200 + 20 = 814.69; estCost = + 60 = 874.69
    expect(r.estMaterialCost).toBeCloseTo(814.69, 1);
    expect(r.estCost).toBeCloseTo(874.69, 1);
  });

  it('handles an empty BOM (metal + labor only)', () => {
    const r = estimateDesignCost({ stlVolumeCm3: 1.0, metalKey: 'GOLD_14K_YELLOW', metalPrices: { gold: 60 } });
    expect(r.stonesCost).toBe(0);
    expect(r.estMaterialCost).toBeCloseTo(594.69, 1);
    expect(r.estCost).toBeCloseTo(594.69, 1);
  });
});

describe('estimateGemstoneCost (rough material x yield + cut labor - like jewelry)', () => {
  it('a 1ct finished stone at 25% yield needs 4ct rough: 4 x $50 + $60 labor', () => {
    const r = estimateGemstoneCost({ carat: 1, roughRatePerCarat: 50, cutLaborCost: 60 });
    expect(r.roughCarats).toBeCloseTo(4, 2);      // 1ct / 0.25 default yield
    expect(r.materialCost).toBeCloseTo(200, 2);   // 4ct rough x $50
    expect(r.estCost).toBeCloseTo(260, 2);
  });

  it('honors a per-variant yield override', () => {
    const r = estimateGemstoneCost({ carat: 2, roughRatePerCarat: 30, yield: 0.5, cutLaborCost: 0 });
    expect(r.roughCarats).toBeCloseTo(4, 2);      // 2ct / 0.5
    expect(r.estCost).toBeCloseTo(120, 2);
  });

  it('falls back to the default yield on junk input', () => {
    const r = estimateGemstoneCost({ carat: 1, roughRatePerCarat: 100, yield: 7 });
    expect(r.yield).toBe(0.25);
  });
});

describe('gemTierRate - strict, no silent fallback', () => {
  const rates = [{ upToCt: 2, ratePerCarat: 60 }, { upToCt: 4, ratePerCarat: 90 }];
  it('resolves the covering tier', () => {
    expect(gemTierRate(rates, 1.5)).toBe(60);
    expect(gemTierRate(rates, 2)).toBe(60);
    expect(gemTierRate(rates, 3.5)).toBe(90);
  });
  it('returns NULL beyond the last tier (special request, not the cheap rate)', () => {
    expect(gemTierRate(rates, 4.5)).toBeNull();
    expect(gemTierRate([], 1)).toBeNull();
  });
});

describe('gemstoneFromPrice + publicGemstoneSpec (listing)', () => {
  const design = {
    category: 'gemstone', pricing: { markup: 2 },
    variants: [{ variantId: 'v1', sku: 'G-1', active: true, gemstone: {
      species: 'Garnet', availability: 'purchase', caratMin: 1, caratMax: 4, cutLaborCost: 60, yield: 0.25,
      colors: [{ label: 'red AAA', rates: [{ upToCt: 2, ratePerCarat: 50 }, { upToCt: 4, ratePerCarat: 80 }] }],
    } }],
  };
  it('computes the "from" floor at caratMin: (1/0.25 x 50 + 60) x 2 = 520', () => {
    expect(gemstoneFromPrice(design)).toBeCloseTo(520, 2);
  });
  it('returns null when nothing is priceable', () => {
    expect(gemstoneFromPrice({ category: 'gemstone', variants: [] })).toBeNull();
  });
  it('public spec strips pricing internals, keeps color labels', () => {
    const pub = publicGemstoneSpec(design.variants[0].gemstone);
    expect(pub.species).toBe('Garnet');
    expect(pub.colors).toEqual(['red AAA']);
    expect(pub.cutLaborCost).toBeUndefined();
    expect(pub.lotQty).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain('ratePerCarat');
  });
});

describe('validateDesign - gemstone variants (capability model)', () => {
  const base = { status: 'ready', productionMethod: PRODUCTION_METHOD.HANDMADE, edition: { type: EDITION_TYPE.UNLIMITED, allocated: 0, committed: 0 } };
  const goodGem = { species: 'Garnet', availability: 'purchase', caratMin: 1, caratMax: 4, colors: [{ label: 'red', rates: [{ upToCt: 4, ratePerCarat: 50 }] }] };
  const variant = (gemstone) => ({ variantId: 'v1', sku: 'GEM-1', active: true, gemstone });

  it('accepts a priceable purchase variant', () => {
    expect(validateDesign({ ...base, category: 'gemstone', variants: [variant(goodGem)] }).valid).toBe(true);
  });
  it('accepts multiple species variants (a design can offer many)', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [
      variant(goodGem),
      { variantId: 'v2', sku: 'GEM-2', active: true, gemstone: { species: 'Sapphire', availability: 'special_request' } },
    ] });
    expect(r.valid).toBe(true);
  });
  it('rejects a variant without a species', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [variant({ ...goodGem, species: '' })] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/species/);
  });
  it('rejects caratMin > caratMax', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [variant({ ...goodGem, caratMin: 5 })] });
    expect(r.errors.join(' ')).toMatch(/caratMin exceeds caratMax/);
  });
  it('rejects a purchase variant whose tiers do not cover caratMax', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [variant({ ...goodGem, colors: [{ label: 'red', rates: [{ upToCt: 2, ratePerCarat: 50 }] }] })] });
    expect(r.errors.join(' ')).toMatch(/only cover up to 2ct/);
  });
  it('rejects a purchase variant with no color buckets', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [variant({ ...goodGem, colors: [] })] });
    expect(r.errors.join(' ')).toMatch(/color bucket/);
  });
  it('allows a special_request variant with no rates at all', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [variant({ species: 'Sapphire', availability: 'special_request' })] });
    expect(r.valid).toBe(true);
  });
  it('still rejects ringSize on a gemstone variant (non-ring branch)', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [{ ...variant(goodGem), ringSize: 7 }] });
    expect(r.errors.join(' ')).toMatch(/ring sizing is only valid for rings/);
  });
});
