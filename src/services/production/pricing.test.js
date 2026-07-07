import { describe, it, expect } from 'vitest';
import { priceSelection } from '@/services/production/pricing';

describe('priceSelection (M3-T3 live config pricing)', () => {
  it('sums gems × qty + findings + labor and applies markup', () => {
    const out = priceSelection({
      resolvedMeshMap: [
        { type: 'gem', gemPreset: 'diamond', qty: 2 },
        { type: 'gem', gemPreset: 'amethyst' }, // qty defaults to 1
      ],
      gemUnitPrice: (p) => ({ diamond: 100, amethyst: 25 }[p] || 0),
      findingsCost: 10,
      laborCost: 40,
      markup: 2,
    });
    // gems = 100*2 + 25 = 225; cost = 225 + 10 + 40 = 275; price = 275*2 = 550
    expect(out.breakdown.gems).toBe(225);
    expect(out.costBasis).toBe(275);
    expect(out.price).toBe(550);
    expect(out.currency).toBe('USD');
    expect(out.breakdown.gemLines).toEqual([
      { gemPreset: 'diamond', qty: 2, unit: 100 },
      { gemPreset: 'amethyst', qty: 1, unit: 25 },
    ]);
  });

  it('prices metal from STL weight via the resolved metalKey (silver, deterministic)', () => {
    // SILVER_STERLING sg 10.40, purity .925; silver $1/g; volume 10cm³ → wax 10g →
    // metal 104g → priceAdj 0.925 → ×1.3 casting = 125.06
    const out = priceSelection({
      resolvedMeshMap: [{ type: 'metal', finish: 'silverPolished' }],
      stlVolumeCm3: 10,
      metalPrices: { silver: 1 },
      resolveMetalKey: () => 'SILVER_STERLING',
      markup: 1,
    });
    expect(out.breakdown.metal).toBe(125.06);
    expect(out.price).toBe(125.06);
  });

  it('skips a metal slot whose finish does not resolve to a metalKey', () => {
    const out = priceSelection({
      resolvedMeshMap: [{ type: 'metal', finish: 'unknownFinish' }],
      stlVolumeCm3: 10,
      metalPrices: { gold: 60 },
      resolveMetalKey: () => null, // unresolved → skipped, not thrown
    });
    expect(out.breakdown.metal).toBe(0);
    expect(out.price).toBe(0);
  });

  it('prices metal + gems together across fixed AND customizable slots (iterates all)', () => {
    const out = priceSelection({
      resolvedMeshMap: [
        { type: 'metal', finish: 'silverPolished' }, // fixed
        { type: 'gem', gemPreset: 'diamond' },        // customer choice
        { type: 'ignore', nameContains: 'Prong' },    // ignored slot
      ],
      stlVolumeCm3: 10,
      metalPrices: { silver: 1 },
      resolveMetalKey: () => 'SILVER_STERLING',
      gemUnitPrice: () => 300,
      markup: 1,
    });
    expect(out.breakdown.metal).toBe(125.06);
    expect(out.breakdown.gems).toBe(300);
    expect(out.costBasis).toBe(425.06);
  });

  it('empty / member-less selection → zero price, no throw', () => {
    expect(priceSelection({}).price).toBe(0);
    expect(priceSelection({ resolvedMeshMap: [] }).costBasis).toBe(0);
  });
});
