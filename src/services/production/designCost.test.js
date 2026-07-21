import { describe, expect, it } from 'vitest';
import { estimateMetalCost, estimateDesignCost, estimateGemstoneCost } from '@/services/production/designCost';
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

describe('estimateGemstoneCost (carat × rate + cut labor)', () => {
  it('prices a 2ct stone at $100/ct + 1.5h cut labor @ $40', () => {
    const r = estimateGemstoneCost({ carat: 2, ratePerCarat: 100, cutLaborHours: 1.5, laborRate: 40 });
    expect(r.roughCost).toBeCloseTo(200, 2);   // 2ct × $100
    expect(r.laborCost).toBeCloseTo(60, 2);     // 1.5h × $40
    expect(r.estMaterialCost).toBeCloseTo(200, 2);
    expect(r.estCost).toBeCloseTo(260, 2);
  });

  it('adds an explicit extra (e.g. cert fee) into material, no labor', () => {
    const r = estimateGemstoneCost({ carat: 1, ratePerCarat: 50, extraCost: 25 });
    expect(r.estMaterialCost).toBeCloseTo(75, 2);
    expect(r.estCost).toBeCloseTo(75, 2);
  });

  it('handles missing inputs → 0', () => {
    const r = estimateGemstoneCost({});
    expect(r.estCost).toBe(0);
  });
});

describe('validateDesign — gemstone category', () => {
  const base = { status: 'ready', productionMethod: PRODUCTION_METHOD.HANDMADE, edition: { type: EDITION_TYPE.ONE_OF_ONE, allocated: 0, committed: 0 } };
  it('accepts a gemstone design with a species + non-ring variant', () => {
    const r = validateDesign({ ...base, category: 'gemstone', gemstone: { species: 'Amethyst' }, variants: [{ variantId: 'v1', sku: 'GEM-1', active: true }] });
    expect(r.valid).toBe(true);
  });
  it('rejects a gemstone design missing gemstone.species', () => {
    const r = validateDesign({ ...base, category: 'gemstone', variants: [{ variantId: 'v1', sku: 'GEM-1', active: true }] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/species/);
  });
  it('rejects a gemstone variant that carries ringSize (non-ring branch)', () => {
    const r = validateDesign({ ...base, category: 'gemstone', gemstone: { species: 'Sapphire' }, variants: [{ variantId: 'v1', sku: 'GEM-1', active: true, ringSize: 7 }] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/ring sizing is only valid for rings/);
  });
});
