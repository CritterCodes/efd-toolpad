import { describe, expect, it } from 'vitest';
import { gemDesignCandidates, rankGemDesignCandidates } from '@/services/production/gemDesignMatch';

const design = {
  designID: 'g1', name: 'Solstice Cut', category: 'gemstone', primaryArtisanId: 'cutter-1',
  edition: { type: 'limited', limit: 5, allocated: 1, committed: 1 },
  variants: [{
    variantId: 'v1', active: true,
    gemstone: {
      species: 'Garnet', availability: 'purchase', caratMin: 1, caratMax: 4, yield: 0.25, cutLaborCost: 60,
      colors: [{ label: 'red AAA', rates: [{ upToCt: 2, ratePerCarat: 50 }, { upToCt: 4, ratePerCarat: 80 }] }],
    },
  }],
};

describe('gemDesignCandidates', () => {
  it('matches species + range and prices each color at the carat (rough × yield + labor)', () => {
    const [c] = gemDesignCandidates({ gemType: 'garnet', carat: 1.5 }, design);
    expect(c.kind).toBe('gemDesign');
    expect(c.inRange).toBe(true);
    // 1.5 ÷ 0.25 = 6ct rough × $50 (≤2ct tier) + $60 = $360
    expect(c.colors[0].price).toBeCloseTo(360, 2);
    expect(c.remaining).toBe(3); // 5 − 1 allocated − 1 committed
  });
  it('resolves the higher tier past the boundary', () => {
    const [c] = gemDesignCandidates({ gemType: 'garnet', carat: 3 }, design);
    expect(c.colors[0].price).toBeCloseTo(3 / 0.25 * 80 + 60, 2); // $1020
  });
  it('flags out-of-range and prices beyond tiers as null', () => {
    const [c] = gemDesignCandidates({ gemType: 'garnet', carat: 6 }, design);
    expect(c.inRange).toBe(false);
    expect(c.colors[0].price).toBeNull();
  });
  it('excludes other species, inactive variants, and non-gem designs', () => {
    expect(gemDesignCandidates({ gemType: 'diamond', carat: 1 }, design)).toHaveLength(0);
    const inactive = { ...design, variants: [{ ...design.variants[0], active: false }] };
    expect(gemDesignCandidates({ gemType: 'garnet', carat: 1 }, inactive)).toHaveLength(0);
    expect(gemDesignCandidates({ gemType: 'garnet', carat: 1 }, { ...design, category: 'ring' })).toHaveLength(0);
  });
});

describe('rankGemDesignCandidates', () => {
  it('drops sold-out finite gems', () => {
    const soldOut = { ...design, edition: { type: 'one_of_one', allocated: 1, committed: 0 } };
    expect(rankGemDesignCandidates({ gemType: 'garnet', carat: 1.5 }, [soldOut])).toHaveLength(0);
  });
  it('ranks in-range purchasable first', () => {
    const request = JSON.parse(JSON.stringify(design));
    request.designID = 'g2';
    request.variants[0].gemstone.availability = 'special_request';
    const ranked = rankGemDesignCandidates({ gemType: 'garnet', carat: 1.5 }, [request, design]);
    expect(ranked[0].designID).toBe('g1');
  });
});
