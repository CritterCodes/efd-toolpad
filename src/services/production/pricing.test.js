import { describe, it, expect } from 'vitest';
import { priceSelection, resolveMetalVolumes } from '@/services/production/pricing';

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
    // `breakdown.metal` is METAL ONLY. The casting house's $15 print/sprue fee is a
    // per-PIECE charge (owner, 2026-08-19: mounting = metal ×1.3 + 15), so it sits in
    // its own `printSetup` line and lands in costBasis/price exactly once.
    expect(out.breakdown.metal).toBe(125.06);
    expect(out.breakdown.printSetup).toBe(15);
    expect(out.price).toBe(140.06);
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
    expect(out.costBasis).toBe(440.06); // 125.06 metal + 300 gems + 15 print/sprue
  });

  it('empty / member-less selection → zero price, no throw', () => {
    expect(priceSelection({}).price).toBe(0);
    expect(priceSelection({ resolvedMeshMap: [] }).costBasis).toBe(0);
  });

  // #187 — per-slot metal volume; multi-metal must NOT double-count the whole-model volume.
  it('prices each metal slot off ITS OWN volumeCm3 (no double-count with 2 metal slots)', () => {
    const resolvedMeshMap = [
      { nameContains: 'band', type: 'metal', finish: 'silverPolished' },
      { nameContains: 'prongs', type: 'metal', finish: 'silverPolished' },
    ];
    // designMeshMap authors different per-slot volumes; whole-model stlVolumeCm3 differs from both.
    const designMeshMap = [
      { nameContains: 'band', type: 'metal', volumeCm3: 10 },
      { nameContains: 'prongs', type: 'metal', volumeCm3: 2 },
    ];
    const resolveSlotVolumeCm3 = resolveMetalVolumes({ resolvedMeshMap, designMeshMap, stlVolumeCm3: 999 });
    const out = priceSelection({
      resolvedMeshMap,
      stlVolumeCm3: 999, // must be IGNORED per-slot now
      metalPrices: { silver: 1 },
      resolveMetalKey: () => 'SILVER_STERLING',
      resolveSlotVolumeCm3,
      markup: 1,
    });
    // band(10cm³)=125.06 + prongs(2cm³)=25.01 = 150.07 — NOT 2×(whole-model 999).
    expect(out.breakdown.metal).toBe(150.07);
    // TWO metal slots, ONE ring, ONE print: the $15 must not be charged per slot.
    expect(out.breakdown.printSetup).toBe(15);
  });

  it('CUSTOMIZER_GEM_ENABLED-style gate: gemUnitPrice→0 zeroes the gem line', () => {
    const out = priceSelection({
      resolvedMeshMap: [{ type: 'gem', gemPreset: 'diamond' }],
      gemUnitPrice: () => 0, // route passes 0 when the gem switch is OFF
      markup: 1,
    });
    expect(out.breakdown.gems).toBe(0);
  });
});

describe('resolveMetalVolumes (#187 per-slot metal volume)', () => {
  const designMeshMap = [
    { nameContains: 'band', type: 'metal', volumeCm3: 10 },
    { nameContains: 'prongs', type: 'metal', volumeCm3: 2 },
  ];

  it('returns each slot its authored volume', () => {
    const r = resolveMetalVolumes({
      resolvedMeshMap: [{ nameContains: 'band', type: 'metal', finish: 'x' }, { nameContains: 'prongs', type: 'metal', finish: 'y' }],
      designMeshMap, stlVolumeCm3: 999,
    });
    expect(r({ nameContains: 'band' })).toBe(10);
    expect(r({ nameContains: 'prongs' })).toBe(2);
  });

  it('with ≥2 metal slots, an unauthored slot gets 0 (never the whole model)', () => {
    const r = resolveMetalVolumes({
      resolvedMeshMap: [{ nameContains: 'band', type: 'metal', finish: 'x' }, { nameContains: 'halo', type: 'metal', finish: 'y' }],
      designMeshMap, stlVolumeCm3: 999,
    });
    expect(r({ nameContains: 'halo' })).toBe(0); // not 999
  });

  it('with exactly ONE metal slot + no authored volume, falls back to whole-model stlVolumeCm3', () => {
    const r = resolveMetalVolumes({
      resolvedMeshMap: [{ nameContains: 'solid', type: 'metal', finish: 'x' }],
      designMeshMap: [], stlVolumeCm3: 7,
    });
    expect(r({ nameContains: 'solid' })).toBe(7);
  });
});
