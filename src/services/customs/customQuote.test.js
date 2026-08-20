import { describe, expect, it } from 'vitest';
import { computeQuote, computeMargin, assertMarkupsSane } from '@/services/customs/customQuote';

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
    // Shipping ($20), the design fee ($100), AND the legacy GLB/QC fee fields ($30/$25 —
    // peer artisans' fees, 2026-08-19) PASS THROUGH at cost; everything else takes 2.5×.
    // (1235 − 20 − 100 − 30 − 25) × 2.5 + 20 + 100 + 30 + 25 = 2825.00.
    expect(q.quoteTotal).toBeCloseTo(2825, 2);
  });

  it('labor lines flagged passThrough (GLB / CAD QC review) earn no markup and no rush', () => {
    const q = computeQuote({
      laborTasks: [
        { description: 'GLB Creation', quantity: 1, cost: 50, passThrough: true, markup: 1 },
        { description: 'CAD QC Review', quantity: 1, cost: 25, passThrough: true, markup: 1 },
        { description: 'Set stones', quantity: 1, cost: 100 },
      ],
      isRush: true,
    }, { cogMarkup: 2.5, rushMultiplier: 1.5 });
    expect(q.cog).toBeCloseTo(175, 2);
    // Bench work: 100 × 2.5 × 1.5 = 375. Peer fees ride at cost, un-rushed: + 75.
    expect(q.quoteTotal).toBeCloseTo(450, 2);
    // And the margin floor judges EFD's work alone — the peer fees are pass-through cost.
    expect(q.workCog).toBeCloseTo(100, 2);
    expect(q.passThroughTotal).toBeCloseTo(75, 2);
  });

  it('honours a per-line markup on labor: an outsourced engraver passes through at ×1', () => {
    // The engraver charges $550; forcing the blanket 2.5× would bill the customer $1,375
    // for a vendor invoice EFD added nothing to. Markup 1 passes it through at cost while
    // EFD's own bench task beside it still takes the full markup.
    const q = computeQuote({
      laborTasks: [
        { description: 'Engraving (outsourced)', quantity: 1, cost: 550, markup: 1 },
        { description: 'setting', quantity: 1, cost: 100 },
      ],
    }, { cogMarkup: 2.5 });
    expect(q.cog).toBeCloseTo(650, 2);
    expect(q.quoteTotal).toBeCloseTo(550 + 250, 2);
    // A partial markup prices partial value-add (vendor management, risk) without full keystone.
    const partial = computeQuote({
      laborTasks: [{ description: 'Engraving', quantity: 1, cost: 550, markup: 1.2 }],
    }, { cogMarkup: 2.5 });
    expect(partial.quoteTotal).toBeCloseTo(660, 2);
    // And a typo'd labor markup is rejected like any other per-line markup.
    expect(() => assertMarkupsSane({ laborTasks: [{ description: 'Engraving', markup: 0.12 }] }))
      .toThrow(/Labor task #1 markup \(Engraving\)/);
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

/**
 * PER-LINE MARKUP (owner, 2026-08-11): "there are edge cases where we might need to control markup on
 * expensive accents, im not sure where the line is drawn though. like what if there is just one melee
 * we dont want to markup 2.5?"
 *
 * Exactly because the line can't be stated as a rule, there ISN'T one. No size threshold (it would
 * need a number nobody can name, and would silently reprice a line that crossed it), no stone/not-stone
 * classification (small melee genuinely takes keystone). Each material line carries an optional
 * override; whoever quotes decides on the job in front of them.
 */
describe('per-line material markup', () => {
  const base = { cogMarkup: 2.5, taxRate: 0 };

  it('marks up each accent line at its own override, others at the default', () => {
    const q = {
      accentStones: [
        { description: 'melee ×20', quantity: 20, cost: 12 },              // 240 → × 2.5
        { description: 'one big side stone', quantity: 1, cost: 900, markup: 1.3 },
      ],
    };
    const out = computeQuote(q, base);
    expect(out.cog).toBe(240 + 900);
    expect(out.quoteTotal).toBe(240 * 2.5 + 900 * 1.3);   // 600 + 1170
  });

  it('honours an override on an additional-materials line too', () => {
    const q = { additionalMaterials: [{ description: 'bought-in clasp', quantity: 1, cost: 900, markup: 1.3 }] };
    expect(computeQuote(q, base).quoteTotal).toBe(1170);
  });

  it('multiplies quantity BEFORE the markup', () => {
    const q = { accentStones: [{ description: 'pair', quantity: 2, cost: 500, markup: 1.4 }] };
    expect(computeQuote(q, base).quoteTotal).toBe(1000 * 1.4);
  });

  it('changes nothing when no line sets an override', () => {
    const q = { accentStones: [{ description: 'melee', quantity: 10, cost: 15 }], laborTasks: [{ cost: 100, quantity: 1 }] };
    expect(computeQuote(q, base).quoteTotal).toBe((150 + 100) * 2.5);
  });

  it('ignores junk overrides rather than pricing a line at nothing', () => {
    for (const bad of [0, -2, '', null, 'abc']) {
      const q = { accentStones: [{ description: 'melee', quantity: 1, cost: 100, markup: bad }] };
      expect(computeQuote(q, base).quoteTotal).toBe(250);
    }
  });

  it('an override does NOT exempt the line from rush — only the centre stone is exempt', () => {
    // A markup override says "price this differently", not "why". Inferring rush treatment from it
    // would be a silent second effect.
    const q = { accentStones: [{ description: 'big side stone', quantity: 1, cost: 900, markup: 1.3 }], isRush: true };
    const out = computeQuote(q, { ...base, rushMultiplier: 1.5 });
    expect(out.quoteTotal).toBe(900 * 1.3 * 1.5);
  });

  it('reports the BLENDED effective markup, not a single misleading figure', () => {
    const q = {
      centerstone: { item: '1.5ct', cost: 4000 },
      mounting: { item: 'setting', cost: 800 },
      accentStones: [{ description: 'big side', quantity: 1, cost: 900, markup: 1.3 }],
      laborTasks: [{ cost: 200, quantity: 1 }],
      centerstoneMarkup: 1.3,
    };
    const out = computeQuote(q, base);
    const cog = 4000 + 800 + 900 + 200;                       // 5900
    const total = (800 * 2.5 + 900 * 1.3 + 200 * 2.5) + 4000 * 1.3;  // 2000+1170+500+5200 = 8870
    expect(out.cog).toBe(cog);
    expect(out.quoteTotal).toBe(total);
    expect(out.effectiveMarkup).toBe(Math.round((total / cog) * 1000) / 1000);   // ≈ 1.503
    expect(out.effectiveMarkup).toBeLessThan(2.5);            // the headline 2.5 would misstate it
  });

  it('effectiveMarkup equals cogMarkup when nothing is overridden and there is no rush', () => {
    const q = { mounting: { item: 'band', cost: 400 }, laborTasks: [{ cost: 100, quantity: 1 }] };
    expect(computeQuote(q, base).effectiveMarkup).toBe(2.5);
  });
});

/**
 * THE BELOW-COST TYPO. Per-line markups made a decimal slip cheap: `0.13` for `1.3` on a $4,000 stone
 * quotes it at $520 and the order publishes $1,980 under cost with nothing flagging it. The margin row
 * wouldn't stand out either — a quote holding a pass-through stone already reads low.
 */
describe('assertMarkupsSane', () => {
  const base = { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 };

  it('rejects the decimal-slip that would quote below cost, and names the field', () => {
    expect(() => assertMarkupsSane({ centerstoneMarkup: 0.13 })).toThrow(/Centre-stone markup of 0\.13/);
    expect(() => assertMarkupsSane({ centerstoneMarkup: 0.13 })).toThrow(/decimal point/);
  });

  it('proves what the typo would have cost: a quote $1,980 under cost, silently', () => {
    // Exactly the owner's ring, with the slip.
    const q = { centerstone: { cost: 4000 }, centerstoneMarkup: 0.13, mounting: { cost: 1000 } };
    const bad = computeQuote(q, base);
    expect(bad.quoteTotal).toBe(3020);
    expect(bad.projectedMargin).toBe(-1980);   // computeQuote itself is happy to price this
    expect(() => assertMarkupsSane(q)).toThrow();  // the guard is what stops it
  });

  it('rejects a stray extra digit on the high side too (25 for 2.5)', () => {
    expect(() => assertMarkupsSane({ cogMarkup: 25 })).toThrow(/COG markup of 25/);
  });

  it('accepts the real values in use, and the bounds themselves', () => {
    for (const v of [1, 1.3, 2.5, 10]) {
      expect(() => assertMarkupsSane({ centerstoneMarkup: v, cogMarkup: v })).not.toThrow();
    }
  });

  it('treats unset/blank/zero as "no override", not as an error', () => {
    for (const v of [undefined, null, '', 0]) {
      expect(() => assertMarkupsSane({ centerstoneMarkup: v, cogMarkup: v })).not.toThrow();
    }
    expect(() => assertMarkupsSane({})).not.toThrow();
    expect(() => assertMarkupsSane()).not.toThrow();
  });

  it('catches a typo on a per-line override and says WHICH line', () => {
    const q = {
      accentStones: [{ item: 'melee', cost: 50, markup: 2.5 }, { item: 'sapphire', cost: 900, markup: 0.12 }],
    };
    expect(() => assertMarkupsSane(q)).toThrow(/Accent stone #2 markup \(sapphire\)/);
  });

  it('checks additional-material lines as well as accent stones', () => {
    expect(() => assertMarkupsSane({ additionalMaterials: [{ item: 'clasp', cost: 900, markup: 0.15 }] }))
      .toThrow(/Material #1 markup \(clasp\)/);
  });

  it('rejects junk that Number() cannot make sense of', () => {
    expect(() => assertMarkupsSane({ cogMarkup: 'two point five' })).toThrow(/must be a number/);
  });

  it('a valid quote with per-line overrides still passes end to end', () => {
    const q = {
      centerstone: { cost: 4000 }, centerstoneMarkup: 1.3,
      mounting: { cost: 1000 },
      accentStones: [{ cost: 200, markup: 1.4 }],
    };
    expect(() => assertMarkupsSane(q)).not.toThrow();
    expect(computeQuote(q, base).projectedMargin).toBeGreaterThan(0);
  });
});


/**
 * SHIPPING IS NOT MARKED UP (owner, 2026-08-12: "it just doesn't feel right").
 *
 * Keystone pays for design, bench skill and risk. A shipping label carries none of those, so marking it
 * 2.5× charged a customer $175 to move a $70 package. It stays in `cog` — it genuinely is a cost — it
 * simply earns nothing.
 */
describe('shipping passes through at cost', () => {
  const base = { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 };

  it('adds shipping at cost, not at markup', () => {
    const q = computeQuote({ mounting: { cost: 100 }, shippingCosts: [{ cost: 70 }] }, base);
    expect(q.quoteTotal).toBe(320);          // 100 × 2.5 + 70 — not 170 × 2.5 = 425
    expect(q.shippingTotal).toBe(70);
    expect(q.cog).toBe(170);                 // still a cost
  });

  it('earns exactly zero margin on the shipping line', () => {
    const without = computeQuote({ mounting: { cost: 100 } }, base);
    const with70 = computeQuote({ mounting: { cost: 100 }, shippingCosts: [{ cost: 70 }] }, base);
    expect(with70.quoteTotal - without.quoteTotal).toBe(70);        // revenue up by exactly the cost
    expect(with70.projectedMargin).toBe(without.projectedMargin);   // margin unchanged
  });

  it('RUSH does not touch shipping either — a faster courier is a higher cost, not a multiplier', () => {
    const q = computeQuote({ mounting: { cost: 100 }, shippingCosts: [{ cost: 70 }], isRush: true }, base);
    expect(q.quoteTotal).toBe(445);          // (100 × 2.5) × 1.5 + 70 — shipping outside the rush
  });

  it('sums several shipping lines and the legacy flat field, all at cost', () => {
    const q = computeQuote({
      mounting: { cost: 100 },
      shippingCosts: [{ cost: 35 }, { cost: 35 }],
      shippingCost: 10,
    }, base);
    expect(q.shippingTotal).toBe(80);
    expect(q.quoteTotal).toBe(330);          // 250 + 80
  });

  it('workCog excludes shipping so a zero-margin line cannot read as a loss on the labour', () => {
    const q = computeQuote({ mounting: { cost: 100 }, laborTasks: [{ cost: 50 }], shippingCosts: [{ cost: 70 }] }, base);
    expect(q.cogExCenterstone).toBe(220);    // includes shipping — it is a real cost
    expect(q.workCog).toBe(150);             // excludes it — this is what the margin floor judges
    expect(q.passThroughTotal).toBe(70);     // no centre stone here, so just shipping
  });

  it('the blended markup drops accordingly, which is the honest number', () => {
    const q = computeQuote({ mounting: { cost: 100 }, shippingCosts: [{ cost: 70 }] }, base);
    expect(q.effectiveMarkup).toBeCloseTo(1.882, 3);   // 320 / 170 — not 2.5
  });

  it('a quote with no shipping is completely unchanged', () => {
    const q = computeQuote({ mounting: { cost: 400 }, laborTasks: [{ cost: 100 }] }, base);
    expect(q.quoteTotal).toBe(1250);         // 500 × 2.5, exactly as before
  });
});


/**
 * THE DESIGN FEE PASSES THROUGH (owner, 2026-08-12: "design fee doesnt need marked up").
 *
 * It is the CAD designer's own per-job fee, snapshotted from their profile. EFD collects it and hands it
 * over; marking it up would be taking a cut of an artisan's craft, which is precisely what EFD does not
 * do — it earns on facilitated infrastructure and consignment, never rent on someone else's work.
 *
 * The paid QC REVIEW is separate and IS marked up: that is EFD's own review process.
 */
describe('design fee passes through at cost', () => {
  const base = { cogMarkup: 2.5, rushMultiplier: 1.5, taxRate: 0 };

  it('adds the designer fee at cost, not at markup', () => {
    const q = computeQuote({ mounting: { cost: 100 }, designFee: 100 }, base);
    expect(q.quoteTotal).toBe(350);          // 100 × 2.5 + 100 — not 200 × 2.5 = 500
    expect(q.designTotal).toBe(100);
  });

  it('earns zero margin on it', () => {
    const without = computeQuote({ mounting: { cost: 100 } }, base);
    const withFee = computeQuote({ mounting: { cost: 100 }, designFee: 100 }, base);
    expect(withFee.quoteTotal - without.quoteTotal).toBe(100);
    expect(withFee.projectedMargin).toBe(without.projectedMargin);
  });

  it('rush does not touch it — the designer is paid their fee either way', () => {
    const q = computeQuote({ mounting: { cost: 100 }, designFee: 100, isRush: true }, base);
    expect(q.quoteTotal).toBe(475);          // (100 × 2.5) × 1.5 + 100
  });

  it('CASTING is still marked up — production, not a pass-through', () => {
    const q = computeQuote({ castingCost: 100 }, base);
    expect(q.quoteTotal).toBe(250);          // deliberately 2.5×
  });

  it('the legacy QC review fee passes through — a peer artisan\'s fee (owner, 2026-08-19)', () => {
    // Reverses the earlier "review belongs to EFD" rule: QC review is paid to the reviewing
    // peer designer, so like the design fee EFD collects it and hands it over — no markup, no rush.
    const q = computeQuote({ qcReviewFee: 25 }, base);
    expect(q.quoteTotal).toBe(25);
  });

  it('workCog excludes both pass-throughs so neither reads as a loss on the labour', () => {
    const q = computeQuote({
      mounting: { cost: 100 }, laborTasks: [{ cost: 50 }],
      shippingCosts: [{ cost: 70 }], designFee: 100,
    }, base);
    expect(q.cogExCenterstone).toBe(320);    // every real cost
    expect(q.workCog).toBe(150);             // mounting + labour only
    expect(q.passThroughTotal).toBe(170);    // shipping + design fee
  });

  it('all three pass-throughs together, with a stone and rush', () => {
    const q = computeQuote({
      centerstone: { cost: 200 }, centerstoneMarkup: 1.3,
      mounting: { cost: 100 }, shippingCosts: [{ cost: 70 }], designFee: 100, isRush: true,
    }, base);
    // (100 × 2.5) × 1.5 + 200 × 1.3 + 70 + 100 = 375 + 260 + 170
    expect(q.quoteTotal).toBe(805);
  });
});
