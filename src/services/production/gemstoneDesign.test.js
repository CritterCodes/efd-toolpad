import { describe, expect, it } from 'vitest';
import { buildGemstoneDesignSpec, formatDimsMm } from '@/services/production/gemstoneDesign';
import { validateDesign } from '@/app/api/designs/model';

describe('buildGemstoneDesignSpec', () => {
  const base = {
    species: 'Amethyst', carat: 2, dimensions: { length: 8, width: 6, height: 4 },
    color: ['Purple'], clarity: 'VS', naturalSynthetic: 'natural',
    ratePerCarat: 100, cutLaborHours: 1.5, laborRate: 40,
  };

  it('prices with the carat recipe and defaults retail to a markup', () => {
    const s = buildGemstoneDesignSpec({ ...base });
    expect(s._cost.estCost).toBeCloseTo(260, 2);     // 2ct×$100 + 1.5h×$40
    expect(s.estCost).toBeCloseTo(260, 2);
    expect(s.suggestedRetail).toBeCloseTo(650, 2);    // 260 × 2.5 default markup
  });

  it('honors an explicit retail price', () => {
    const s = buildGemstoneDesignSpec({ ...base, retailPrice: 900 });
    expect(s.suggestedRetail).toBe(900);
    expect(s.variants[0].pricing.retailPrice).toBe(900);
  });

  it('one_of_one → roughQty 1; limited → roughQty = limit', () => {
    expect(buildGemstoneDesignSpec({ ...base, editionType: 'one_of_one' }).variants[0].roughQty).toBe(1);
    const lim = buildGemstoneDesignSpec({ ...base, editionType: 'limited', editionLimit: 5 });
    expect(lim.edition).toMatchObject({ type: 'limited', limit: 5 });
    expect(lim.variants[0].roughQty).toBe(5);
    expect(buildGemstoneDesignSpec({ ...base, editionType: 'unlimited' }).variants[0].roughQty).toBeNull();
  });

  it('shapes a gemstone Design (category, handmade, gem sub-doc, no ring sizing)', () => {
    const s = buildGemstoneDesignSpec({ ...base });
    expect(s.category).toBe('gemstone');
    expect(s.productionMethod).toBe('handmade');
    expect(s.gemstone.species).toBe('Amethyst');
    expect(s.gemstone.naturalSynthetic).toBe('natural');
    expect(s.variants[0].caratEach).toBe(2);
    expect(s.variants[0].sizeMm).toBe('8 x 6 x 4 mm');
    expect(s.variants[0].ringSize).toBeUndefined();
  });

  it('produces a spec that PASSES validateDesign', () => {
    const s = buildGemstoneDesignSpec({ ...base, status: 'ready' });
    expect(validateDesign(s).valid).toBe(true);
  });

  it('throws without a species', () => {
    expect(() => buildGemstoneDesignSpec({ carat: 1 })).toThrow(/species/);
  });

  it('formatDimsMm handles partial/empty dims', () => {
    expect(formatDimsMm({ length: 5, width: 3 })).toBe('5 x 3 mm');
    expect(formatDimsMm({})).toBeNull();
  });
});
