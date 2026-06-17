import { describe, expect, it } from 'vitest';
import { computeQuote, computeMargin } from '@/services/customs/customQuote';

describe('computeQuote (single COG bucket)', () => {
  it('folds everything into COG and marks up by cogMarkup', () => {
    const q = computeQuote({
      materialCosts: [{ cost: 200 }], // incl. gemstones
      laborCost: 100,
      castingCost: 50,
      shippingCost: 20,
      designFee: 100,
      glbFee: 30,
      qcReviewFee: 25,
    }, { cogMarkup: 2.5 });
    expect(q.cog).toBeCloseTo(525, 2);          // 200+100+50+20+100+30+25
    expect(q.cogMarkup).toBe(2.5);
    expect(q.quoteTotal).toBeCloseTo(1312.5, 2); // 525 × 2.5
    expect(q.projectedMargin).toBeCloseTo(787.5, 2);
  });

  it('applies rush as a multiplier on the marked-up total', () => {
    const q = computeQuote({ laborCost: 100, castingCost: 0, rushMultiplier: 1.5 }, { cogMarkup: 2 });
    expect(q.quoteTotal).toBeCloseTo(300, 2); // 100 × 2 × 1.5
  });

  it('derives material line cost from qty × unitPrice when cost absent', () => {
    const q = computeQuote({ materialCosts: [{ quantity: 3, unitPrice: 40 }] }, { cogMarkup: 2 });
    expect(q.cog).toBeCloseTo(120, 2);
    expect(q.quoteTotal).toBeCloseTo(240, 2);
  });

  it('defaults cogMarkup to 2.5 and is empty-safe', () => {
    expect(computeQuote({ laborCost: 100 }).quoteTotal).toBeCloseTo(250, 2);
    expect(computeQuote({}).quoteTotal).toBe(0);
  });
});

describe('computeMargin', () => {
  it('computes margin and % against summed piece COGS', () => {
    const m = computeMargin(1000, [170, 30]); // cogs 200
    expect(m.cogs).toBeCloseTo(200, 2);
    expect(m.margin).toBeCloseTo(800, 2);
    expect(m.marginPct).toBeCloseTo(80, 1);
  });

  it('is zero-safe', () => {
    expect(computeMargin(0, []).marginPct).toBe(0);
  });
});
