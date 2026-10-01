import { describe, it, expect } from 'vitest';
import { resolvePricingSettings } from './engine';
import { estimateTasks, withSizeCount } from './estimate';

/** The shop's online estimate — the same engine, the same numbers the counter charges. */
const settings = resolvePricingSettings({
  pricing: {
    wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25, wholesaleMarkup: 1.2,
    rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095, minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
    quantityTiers: [{ minQty: 1, toolPct: 100, marginPct: 100 }],
  },
});
const SOLDER = { _id: 'm-solder', isMetalDependent: true, portionsPerUnit: 30, stullerProducts: [
  { metalType: 'yellow_gold', karat: '14K', stullerPrice: 134.55 },
  { metalType: 'sterling_silver', karat: '925', stullerPrice: 12, portionsPerUnit: 60 },
  { metalType: 'platinum', karat: '950', stullerPrice: 300 },
] };
const STOCK = { _id: 'm-stock', isMetalDependent: true, stullerProducts: [{ metalType: 'yellow_gold', karat: '14K', stullerPrice: 10 }] };
const ctx = { settings, materials: [SOLDER, STOCK], tools: [], metals: ['sterling_silver_925', 'yellow_gold_14k', 'platinum_950'] };

const sizeUp = { _id: 't-up', title: 'Size up', processes: [{ laborHours: 0.5, quantity: 1 }],
  materials: [{ materialId: 'm-solder', quantity: 1 }, { materialId: 'm-stock', displayName: '3x2 mm Flat Sizing Stock', quantity: 1 }] };
const polish = { _id: 't-polish', title: 'Clean and polish', processes: [{ laborHours: 0.25, quantity: 1 }], materials: [] };

describe('estimateTasks', () => {
  it('prices each task in the customer\'s metal, by the engine, to the cent — no $5 rounding', () => {
    const [row] = estimateTasks({ tasks: [sizeUp], ctx, metals: [{ metalType: 'gold', karat: '14k', goldColor: 'yellow' }] });
    // $25 labor + $4.49 solder + $10 stock = $39.49 × 2
    expect(row.prices).toEqual({ yellow_gold_14k: 78.98 });
  });

  it('platinum is priced from the 950 stock (the shop sent platinum_null, which matched nothing)', () => {
    const [row] = estimateTasks({ tasks: [polish, sizeUp], ctx, metals: [{ metalType: 'platinum', karat: '950' }] }).slice(1);
    expect(row.prices).toEqual({}); // no platinum sizing stock → not priced, never $0
    const [p] = estimateTasks({ tasks: [{ ...sizeUp, materials: [sizeUp.materials[0]] }], ctx, metals: [{ metalType: 'platinum', karat: '950' }] });
    expect(p.prices.platinum_950).toBe(70);
  });

  it('"not sure" prices every stocked metal; a metal-free task is the same everywhere', () => {
    const [row] = estimateTasks({ tasks: [polish], ctx });
    expect(row.prices).toEqual({ sterling_silver_925: 25, yellow_gold_14k: 25, platinum_950: 25 });
  });

  it('sizing up N sizes adds a portion of sizing stock per size, labor once', () => {
    expect(withSizeCount(sizeUp, 3).materials[1].quantity).toBe(3);
    expect(withSizeCount(sizeUp, 3).materials[0].quantity).toBe(1);
    const [row] = estimateTasks({ tasks: [sizeUp], ctx, metals: [{ metalType: 'gold', karat: '14k', goldColor: 'yellow' }], sizeCount: 3 });
    expect(row.prices.yellow_gold_14k).toBe(118.98); // ($25 + $4.49 + $30) × 2
  });
});
