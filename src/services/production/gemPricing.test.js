import { describe, it, expect } from 'vitest';
import { priceGemAtCarat, snapCarat, gemMarkupFor, gemSizingFor, GEM_CARAT_STEP } from '@/services/production/gemPricing';

const design = {
  category: 'gemstone',
  stlVolumeCm3: 0.0755, // ≈ 1ct base for an amethyst (0.0755 × 2.65 × 5 ≈ 1)
  pricing: { markup: 2 },
  variants: [
    {
      variantId: 'v-garnet', sku: 'G-1', active: true,
      gemstone: {
        species: 'Garnet', availability: 'purchase', caratMin: 1, caratMax: 4,
        cutLaborCost: 60, yield: 0.25,
        colors: [{ label: 'red AAA', rates: [{ upToCt: 2, ratePerCarat: 50 }, { upToCt: 4, ratePerCarat: 80 }] }],
      },
    },
    {
      variantId: 'v-sapphire', sku: 'G-2', active: true,
      gemstone: { species: 'Sapphire', availability: 'special_request', caratMin: 1, caratMax: 3, colors: [] },
    },
    {
      variantId: 'v-off', sku: 'G-3', active: false,
      gemstone: { species: 'Citrine', availability: 'purchase', caratMin: 1, caratMax: 2, colors: [{ label: 'gold', rates: [{ upToCt: 2, ratePerCarat: 10 }] }] },
    },
  ],
};

describe('snapCarat', () => {
  it('snaps to the 0.25ct pick step', () => {
    expect(snapCarat(1.13)).toBe(1.25);
    expect(snapCarat(1.12)).toBe(1);
    expect(snapCarat(2)).toBe(2);
    expect(GEM_CARAT_STEP).toBe(0.25);
  });
});

describe('gemMarkupFor', () => {
  it('variant override > design markup > settings default', () => {
    expect(gemMarkupFor(design, { markupOverride: 3 }, 2.5)).toBe(3);
    expect(gemMarkupFor(design, {}, 2.5)).toBe(2);
    expect(gemMarkupFor({}, {}, 2.5)).toBe(2.5);
  });
});

describe('priceGemAtCarat', () => {
  it('prices the editor recipe: (ct/yield × rate + cutLabor + shared) × markup', () => {
    // 1.5ct: rough 1.5/0.25 × 50 = 300; +60 labor = 360; +40 shared = 400; ×2 = 800
    const r = priceGemAtCarat({ design, variantId: 'v-garnet', colorLabel: 'red AAA', carat: 1.5, sharedCosts: 40 });
    expect(r.ok).toBe(true);
    expect(r.retail).toBeCloseTo(800, 2);
    expect(r.carat).toBe(1.5);
  });
  it('snaps the carat before pricing', () => {
    const r = priceGemAtCarat({ design, variantId: 'v-garnet', colorLabel: 'red AAA', carat: 1.4 });
    expect(r.ok).toBe(true);
    expect(r.carat).toBe(1.5);
  });
  it('special_request variant → special-request code', () => {
    const r = priceGemAtCarat({ design, variantId: 'v-sapphire', colorLabel: 'blue', carat: 1 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('special-request');
  });
  it('carat outside [min,max] → special-request', () => {
    expect(priceGemAtCarat({ design, variantId: 'v-garnet', colorLabel: 'red AAA', carat: 0.5 }).code).toBe('special-request');
    expect(priceGemAtCarat({ design, variantId: 'v-garnet', colorLabel: 'red AAA', carat: 5 }).code).toBe('special-request');
  });
  it('past the last rate tier → special-request, never a fallback rate', () => {
    const wide = structuredClone(design);
    wide.variants[0].gemstone.caratMax = 6;
    // 5ct is within [1,6] but beyond the 4ct tier cap
    expect(priceGemAtCarat({ design: wide, variantId: 'v-garnet', colorLabel: 'red AAA', carat: 5 }).code).toBe('special-request');
  });
  it('inactive variant / unknown color → unavailable', () => {
    expect(priceGemAtCarat({ design, variantId: 'v-off', colorLabel: 'gold', carat: 1 }).code).toBe('unavailable');
    expect(priceGemAtCarat({ design, variantId: 'v-garnet', colorLabel: 'nope', carat: 1 }).code).toBe('unavailable');
  });
});

describe('gemSizingFor — REFRAKT config.sizing host obligations', () => {
  it('baseCarat = stlVolumeCm3 × sg × 5, sg from the species table', () => {
    const s = gemSizingFor(design, design.variants[0]); // garnet sg 3.90
    expect(s.enabled).toBe(true);
    expect(s.sg).toBe(3.9);
    expect(s.baseCarat).toBeCloseTo(0.0755 * 3.9 * 5, 2);
    expect(s.caratMin).toBe(1);
    expect(s.caratMax).toBe(4);
    expect(s.stepCt).toBe(0.25);
  });
  it('per-variant sg override wins over the table', () => {
    const v = structuredClone(design.variants[0]);
    v.gemstone.sg = 3.5;
    expect(gemSizingFor(design, v).sg).toBe(3.5);
  });
  it('no STL volume or unknown species → null (size control stays off, listing still sells)', () => {
    expect(gemSizingFor({ ...design, stlVolumeCm3: 0 }, design.variants[0])).toBeNull();
    const v = structuredClone(design.variants[0]);
    v.gemstone.species = 'Unobtanium';
    expect(gemSizingFor(design, v)).toBeNull();
  });
});
