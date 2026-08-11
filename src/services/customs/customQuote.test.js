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

/**
 * CENTRE-STONE MARKUP (owner, 2026-08-11): "we sold our first natural diamond, and we cant charge a
 * 2.5 markup to it, its more like a 1.3 markup, but we still need to charge a 2.5 to the rest of the
 * ring."
 *
 * A significant stone doesn't carry mounting keystone — the trade prices it near cost. Applying the
 * full 2.5× either loses the sale or overcharges the customer.
 *
 * THE PROPERTY THAT MATTERS MOST is the first test: with no centre-stone markup set anywhere, the
 * total must be byte-identical to the old single-bucket maths. Every quote written before this feature
 * existed has to price exactly as it did, or splitting the bucket silently reprices live work.
 */
describe('centre-stone markup', () => {
  const ring = {
    centerstone: { item: '1.5ct natural', cost: 4000 },
    mounting: { item: '14k setting', cost: 800 },
    laborTasks: [{ cost: 200, quantity: 1 }],
  };

  it('does NOT reprice a quote when no stone markup is set anywhere', () => {
    const out = computeQuote(ring, { cogMarkup: 2.5, taxRate: 0 });
    const cog = 4000 + 800 + 200;
    expect(out.cog).toBe(cog);
    expect(out.centerstoneMarkup).toBe(2.5);          // falls back to cogMarkup, not to a stone default
    expect(out.quoteTotal).toBe(cog * 2.5);           // identical to the old single-bucket result
  });

  it('applies the stone markup to the stone and the COG markup to everything else', () => {
    const out = computeQuote({ ...ring, centerstoneMarkup: 1.3 }, { cogMarkup: 2.5, taxRate: 0 });
    // 4000 × 1.3 = 5200 for the stone; (800 + 200) × 2.5 = 2500 for the ring.
    expect(out.quoteTotal).toBe(5200 + 2500);
    expect(out.centerstoneMarkup).toBe(1.3);
    expect(out.cogMarkup).toBe(2.5);
  });

  it('keeps `cog` as the FULL job cost so margin and the floor guardrail still mean something', () => {
    const out = computeQuote({ ...ring, centerstoneMarkup: 1.3 }, { cogMarkup: 2.5, taxRate: 0 });
    expect(out.cog).toBe(5000);                        // stone included
    expect(out.cogExCenterstone).toBe(1000);
    expect(out.centerstoneCost).toBe(4000);
    expect(out.projectedMargin).toBe(out.quoteTotal - out.cog);   // 7700 - 5000 = 2700
    expect(out.projectedMargin).toBe(2700);
  });

  it('takes the per-quote override over the settings default', () => {
    const out = computeQuote({ ...ring, centerstoneMarkup: 1.15 }, { cogMarkup: 2.5, centerstoneMarkup: 1.3, taxRate: 0 });
    expect(out.centerstoneMarkup).toBe(1.15);
    expect(out.quoteTotal).toBe(4000 * 1.15 + 1000 * 2.5);
  });

  it('uses the settings default when the quote sets none', () => {
    const out = computeQuote(ring, { cogMarkup: 2.5, centerstoneMarkup: 1.3, taxRate: 0 });
    expect(out.centerstoneMarkup).toBe(1.3);
    expect(out.quoteTotal).toBe(4000 * 1.3 + 1000 * 2.5);
  });

  it('leaves a quote with no centre stone completely unaffected', () => {
    const noStone = { mounting: { item: 'band', cost: 500 }, laborTasks: [{ cost: 100, quantity: 1 }] };
    const a = computeQuote(noStone, { cogMarkup: 2.5, taxRate: 0 });
    const b = computeQuote(noStone, { cogMarkup: 2.5, centerstoneMarkup: 1.3, taxRate: 0 });
    expect(a.quoteTotal).toBe(600 * 2.5);
    expect(b.quoteTotal).toBe(a.quoteTotal);           // a stone default can't move a stoneless quote
  });

  it('taxes the blended pre-tax price, not the unsplit one', () => {
    const out = computeQuote({ ...ring, centerstoneMarkup: 1.3 }, { cogMarkup: 2.5, taxRate: 0.0875 });
    expect(out.quoteTotal).toBe(7700);
    expect(out.taxAmount).toBe(round2(7700 * 0.0875));
    expect(out.total).toBe(round2(7700 + 7700 * 0.0875));
  });

  /**
   * RUSH DOESN'T TOUCH THE STONE (owner agreed, 2026-08-11). A rush premium prices EFD's capacity —
   * queue disruption, overtime, bumped clients. A bought-in stone costs the same whether it's set
   * tomorrow or in three weeks, so rushing it buys the customer nothing.
   *
   * The numbers settled it: on this ring at 1.5× rush, $2,600 of the $3,850 uplift came from the stone
   * — two thirds of the rush fee on the one line that took no extra work, and more than the whole
   * marked-up mounting.
   */
  it('applies rush to the RING only, never to the centre stone', () => {
    const out = computeQuote({ ...ring, centerstoneMarkup: 1.3, isRush: true }, { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 });
    // ring 1000 × 2.5 × 1.5 = 3750; stone 4000 × 1.3 = 5200, untouched by rush.
    expect(out.quoteTotal).toBe(3750 + 5200);
    expect(out.quoteTotal).not.toBe(7700 * 1.5);   // the old behaviour, $2,600 higher
  });

  it('leaves the stone out of rush even when no stone markup is set', () => {
    // NOTE this DOES reprice an existing rush quote — deliberately. The non-regression guarantee above
    // covers non-rush quotes; a rush quote with a stone was overcharging and now doesn't.
    const out = computeQuote({ ...ring, isRush: true }, { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 });
    expect(out.centerstoneMarkup).toBe(2.5);                  // still falls back to cogMarkup
    expect(out.quoteTotal).toBe(1000 * 2.5 * 1.5 + 4000 * 2.5);   // 3750 + 10000
  });

  it('rush on a stoneless quote is unchanged — nothing to hold back', () => {
    const noStone = { mounting: { item: 'band', cost: 500 }, laborTasks: [{ cost: 100, quantity: 1 }], isRush: true };
    const out = computeQuote(noStone, { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 });
    expect(out.quoteTotal).toBe(600 * 2.5 * 1.5);
  });

  it('ignores a zero or nonsense stone markup rather than pricing the stone at nothing', () => {
    for (const bad of [0, -1, '', null, 'abc']) {
      const out = computeQuote({ ...ring, centerstoneMarkup: bad }, { cogMarkup: 2.5, taxRate: 0 });
      expect(out.centerstoneMarkup).toBe(2.5);
      expect(out.quoteTotal).toBe(5000 * 2.5);
    }
  });
});

const round2 = (v) => Math.round(v * 100) / 100;
