import { describe, expect, it } from 'vitest';
import { computeQuote, computeMargin } from '@/services/customs/customQuote';

describe('computeQuote (structured single-COG bucket)', () => {
  it('folds structured materials/labor/shipping + fees into COG and marks up', () => {
    const q = computeQuote({
      centerstone: { item: 'Sapphire', cost: 500 },
      mounting: { item: '14k band', cost: 200 },
      accentStones: [{ description: 'melee', quantity: 4, cost: 25 }], // 100
      additionalMaterials: [{ description: 'clasp', quantity: 1, cost: 50 }], // 50
      laborTasks: [{ description: 'setting', quantity: 1, cost: 120 }, { description: 'polish', quantity: 1, cost: 30 }], // 150
      shippingCosts: [{ description: 'insured', cost: 20 }],
      castingCost: 60, designFee: 100, glbFee: 30, qcReviewFee: 25,
    }, { cogMarkup: 2.5 });
    // 700 + 100 + 50 + 150 + 20 + 60 + 100 + 30 + 25 = 1235
    expect(q.cog).toBeCloseTo(1235, 2);
    expect(q.quoteTotal).toBeCloseTo(3087.5, 2); // 1235 × 2.5
  });

  it('applies rush when isRush (settings rushMultiplier)', () => {
    const q = computeQuote({ laborTasks: [{ cost: 100, quantity: 1 }], isRush: true }, { cogMarkup: 2, rushMultiplier: 1.5 });
    expect(q.quoteTotal).toBeCloseTo(300, 2); // 100 × 2 × 1.5
  });

  it('still sums legacy flat fields (back-compat) and defaults markup to 2.5', () => {
    const q = computeQuote({ materialCosts: [{ cost: 200 }], laborCost: 100 });
    expect(q.cog).toBeCloseTo(300, 2);
    expect(q.quoteTotal).toBeCloseTo(750, 2);
    expect(computeQuote({}).quoteTotal).toBe(0);
  });

  it('per-quote cogMarkup overrides the settings default; blank falls back', () => {
    const lines = { laborTasks: [{ cost: 100, quantity: 1 }] };
    // quote override (3) wins over settings (2)
    expect(computeQuote({ ...lines, cogMarkup: 3 }, { cogMarkup: 2 }).quoteTotal).toBeCloseTo(300, 2);
    // no override → settings default (2)
    expect(computeQuote({ ...lines }, { cogMarkup: 2 }).quoteTotal).toBeCloseTo(200, 2);
    // neither → hard default 2.5
    expect(computeQuote({ ...lines }).quoteTotal).toBeCloseTo(250, 2);
  });

  it('adds sales tax on top of the marked-up total (quoteTotal stays pre-tax)', () => {
    const q = computeQuote(
      { laborTasks: [{ cost: 100, quantity: 1 }] },
      { cogMarkup: 2, taxRate: 0.0875 },
    );
    expect(q.quoteTotal).toBeCloseTo(200, 2); // pre-tax (revenue/margin basis)
    expect(q.taxRate).toBeCloseTo(0.0875, 4);
    expect(q.taxAmount).toBeCloseTo(17.5, 2); // 200 × 8.75%
    expect(q.total).toBeCloseTo(217.5, 2); // tax-inclusive amount billed
  });

  it('taxExempt zeroes tax; explicit quote.taxRate overrides the settings rate', () => {
    const lines = { laborTasks: [{ cost: 100, quantity: 1 }] };
    const exempt = computeQuote({ ...lines, taxExempt: true }, { cogMarkup: 2, taxRate: 0.0875 });
    expect(exempt.taxAmount).toBe(0);
    expect(exempt.total).toBeCloseTo(200, 2);
    const override = computeQuote({ ...lines, taxRate: 0.05 }, { cogMarkup: 2, taxRate: 0.0875 });
    expect(override.taxAmount).toBeCloseTo(10, 2); // 200 × 5%
  });
});

describe('computeMargin', () => {
  it('computes margin and % against summed piece COGS', () => {
    const m = computeMargin(1000, [170, 30]);
    expect(m.cogs).toBeCloseTo(200, 2);
    expect(m.margin).toBeCloseTo(800, 2);
    expect(m.marginPct).toBeCloseTo(80, 1);
  });
  it('is zero-safe', () => { expect(computeMargin(0, []).marginPct).toBe(0); });
});
