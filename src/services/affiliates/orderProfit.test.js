import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The commission base for product sales. What matters here is the REFUSALS: a resolver
 * that guesses a cost pays real money on a made-up number, so every path that can't
 * know the cost must say so rather than approximate.
 */

let productDocs = [];
vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: () => ({
        find: () => ({ toArray: async () => productDocs }),
      }),
    })),
  },
}));

const { resolveOrderProfit } = await import('@/services/affiliates/orderProfit');

const catalogLine = (over = {}) => ({ productId: 'p1', title: 'Silver band', qty: 1, unitPrice: 500, ...over });

beforeEach(() => {
  productDocs = [{ productId: 'p1', title: 'Silver band', pricing: { costBasis: 200 } }];
});

describe('resolveOrderProfit', () => {
  it('prices a catalogue sale from the product cost basis', async () => {
    const r = await resolveOrderProfit({ subtotal: 500, lines: [catalogLine()] });
    expect(r.ok).toBe(true);
    expect(r.revenue).toBe(500);
    expect(r.cost).toBe(200);
    expect(r.profit).toBe(300);
    expect(r.lines[0]).toMatchObject({ productId: 'p1', unitCost: 200, lineCost: 200 });
  });

  it('multiplies cost by quantity', async () => {
    const r = await resolveOrderProfit({ subtotal: 1000, lines: [catalogLine({ qty: 2, unitPrice: 500 })] });
    expect(r.cost).toBe(400);
    expect(r.profit).toBe(600);
  });

  it('EXCLUDES custom-order payment lines — the customs trigger owns that money', async () => {
    const r = await resolveOrderProfit({
      subtotal: 1500,
      lines: [catalogLine(), { type: 'custom-payment', customID: 'CO-1', unitPrice: 1000, qty: 1 }],
    });
    expect(r.ok).toBe(true);
    // Only the $500 product line counts; the $1,000 custom payment is not ours to commission.
    expect(r.revenue).toBe(500);
    expect(r.profit).toBe(300);
  });

  it('a cart of ONLY custom payments is not a review item — there is nothing to commission', async () => {
    const r = await resolveOrderProfit({ subtotal: 1000, lines: [{ type: 'custom-payment', customID: 'CO-1', unitPrice: 1000 }] });
    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(false); // deliberately NOT queued for a human
  });

  it('prices a made-to-order line from its product, same as any other', async () => {
    // MTO lines carry a productId too, and productContract writes a costBasis onto it.
    productDocs = [{ productId: 'p9', title: 'Ridge ring', pricing: { costBasis: 780, costBasisSource: 'estimated' } }];
    const r = await resolveOrderProfit({
      subtotal: 1950,
      lines: [{ productId: 'p9', designID: 'd1', variantId: 'v1', qty: 1, unitPrice: 1950 }],
    });
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(780);
    expect(r.profit).toBe(1170);
    // The variant rides along so a design-level estimate can be reconciled later.
    expect(r.lines[0]).toMatchObject({ designID: 'd1', variantId: 'v1', costBasisSource: 'estimated' });
  });

  it('records whether a cost was the piece ACTUAL or a design estimate', async () => {
    // An estimate must never be presentable as a measured cost — a commission paid off
    // one is explainable only if the basis travels with it.
    productDocs = [{ productId: 'p1', pricing: { costBasis: 200, costBasisSource: 'actual' } }];
    const r = await resolveOrderProfit({ subtotal: 500, lines: [catalogLine()] });
    expect(r.lines[0].costBasisSource).toBe('actual');
  });

  it('refuses a line that carries no productId at all', async () => {
    const r = await resolveOrderProfit({ subtotal: 300, lines: [{ title: 'Mystery', qty: 1, unitPrice: 300 }] });
    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(true);
    expect(r.reason).toMatch(/Mystery.*no productId/i);
  });

  it('refuses when a product has no recorded cost, naming the product', async () => {
    productDocs = [{ productId: 'p1', title: 'Silver band', pricing: {} }];
    const r = await resolveOrderProfit({ subtotal: 500, lines: [catalogLine()] });
    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(true);
    expect(r.reason).toMatch(/Silver band.*no cost basis/i);
  });

  it('ONE unknown line makes the whole order unknown — never a partial profit', async () => {
    // p2 has no cost; a partial number would quietly under-pay the affiliate.
    productDocs = [{ productId: 'p1', pricing: { costBasis: 200 } }, { productId: 'p2', pricing: {} }];
    const r = await resolveOrderProfit({
      subtotal: 900,
      lines: [catalogLine(), catalogLine({ productId: 'p2', title: 'Chain', unitPrice: 400 })],
    });
    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(true);
  });

  it('never prices off the tax-inclusive total', async () => {
    // total 545 includes tax; profit must come off the 500 pre-tax line revenue.
    const r = await resolveOrderProfit({ subtotal: 500, total: 545, tax: 45, lines: [catalogLine()] });
    expect(r.revenue).toBe(500);
    expect(r.profit).toBe(300);
  });

  it('cost above revenue floors at zero rather than going negative', async () => {
    productDocs = [{ productId: 'p1', pricing: { costBasis: 900 } }];
    const r = await resolveOrderProfit({ subtotal: 500, lines: [catalogLine()] });
    expect(r.profit).toBe(0);
  });
});
