import { describe, expect, it } from 'vitest';
import { computeQuote, computeMargin } from '@/services/customs/customQuote';

describe('computeQuote', () => {
  it('applies rush to labor and 40% markup to the subtotal (legacy parity)', () => {
    const q = computeQuote({
      materialCosts: [{ cost: 200 }],
      laborCost: 100,
      rushMultiplier: 1.5,   // labor → 150
      castingCost: 50,
      shippingCost: 20,
      designFee: 100,
      // markup defaults to 0.40
    });
    expect(q.laborTotal).toBeCloseTo(150, 2);
    expect(q.subtotal).toBeCloseTo(520, 2);     // 200+150+50+20+100
    expect(q.markupAmount).toBeCloseTo(208, 2);  // 520 × 0.40
    expect(q.quoteTotal).toBeCloseTo(728, 2);
  });

  it('derives material line cost from qty × unitPrice when cost absent', () => {
    const q = computeQuote({ materialCosts: [{ quantity: 3, unitPrice: 40 }] });
    expect(q.materialsTotal).toBeCloseTo(120, 2);
    expect(q.quoteTotal).toBeCloseTo(168, 2); // 120 × 1.4
  });

  it('honors an explicit markup override and empty quote', () => {
    expect(computeQuote({ laborCost: 100, markup: 0 }).quoteTotal).toBeCloseTo(100, 2);
    expect(computeQuote({}).quoteTotal).toBe(0);
  });
});

describe('computeMargin', () => {
  it('computes margin and % against summed piece COGS', () => {
    const m = computeMargin(728, [170, 30]); // cogs 200
    expect(m.cogs).toBeCloseTo(200, 2);
    expect(m.margin).toBeCloseTo(528, 2);
    expect(m.marginPct).toBeCloseTo(72.5, 1); // 528/728
  });

  it('is zero-safe', () => {
    expect(computeMargin(0, []).marginPct).toBe(0);
  });
});
