import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QUANTITY_TIERS,
  normalizeQuantityTiers,
  tiersFromSettings,
  tierForQuantity,
  tierLabel,
  applyQuantityTier,
} from './quantityTiers';

/**
 * The owner's ladder, and the real task it was designed against: Retip prongs, priced live at
 * 0.2 h × $50 = $10 labor + $10 of Orotig = $20 base → $40 retail / $24 wholesale.
 */
const RETIP = { baseCost: 20, toolDepreciationCost: 10, retailPrice: 40, wholesalePrice: 24 };
const LADDER = DEFAULT_QUANTITY_TIERS;

describe('reading the ladder', () => {
  it('sorts, dedupes and clamps whatever was saved; a lever left out means charge it in full', () => {
    expect(normalizeQuantityTiers([
      { minQty: 10, toolPct: 50 },
      { minQty: 1, toolPct: 140 },
      { minQty: 10, toolPct: 55, marginPct: 80 },
      { minQty: 0, toolPct: 10 },
      { minQty: 5, toolPct: -4 },
      { minQty: 'x', toolPct: 10 },
      { minQty: 30 },
    ])).toEqual([
      { minQty: 1, toolPct: 100, marginPct: 100 },
      { minQty: 5, toolPct: 0, marginPct: 100 },
      { minQty: 10, toolPct: 55, marginPct: 80 },
    ]);
  });

  it('an unconfigured shop has NO quantity pricing — never a silent built-in', () => {
    expect(tiersFromSettings({})).toEqual([]);
    expect(tiersFromSettings({ pricing: {} })).toEqual([]);
    expect(normalizeQuantityTiers(null)).toEqual([]);
    expect(applyQuantityTier({ price: 24, pricing: RETIP, quantity: 42, tiers: [] }).applied).toBe(false);
  });

  it('picks the highest tier the quantity reaches, and reads it back the way a ticket would', () => {
    expect(tierForQuantity(LADDER, 1)).toMatchObject({ minQty: 1 });
    expect(tierForQuantity(LADDER, 4)).toMatchObject({ minQty: 1 });
    expect(tierForQuantity(LADDER, 5)).toMatchObject({ minQty: 5 });
    expect(tierForQuantity(LADDER, 19)).toMatchObject({ minQty: 10 });
    expect(tierForQuantity(LADDER, 200)).toMatchObject({ minQty: 20 });

    expect(tierLabel(LADDER, tierForQuantity(LADDER, 6))).toBe('5–9');
    expect(tierLabel(LADDER, tierForQuantity(LADDER, 42))).toBe('20+');
  });
});

describe('the price the owner signed off on', () => {
  const at = (qty, price) => applyQuantityTier({ price, pricing: RETIP, quantity: qty, tiers: LADDER }).unitPrice;

  it('reproduces the wholesale column exactly', () => {
    expect(at(1, 24)).toBe(24);
    expect(at(4, 24)).toBe(24);
    expect(at(5, 24)).toBe(20.4);
    expect(at(9, 24)).toBe(20.4);
    expect(at(10, 24)).toBe(18);
    expect(at(19, 24)).toBe(18);
    expect(at(20, 24)).toBe(15.6);
    expect(at(42, 24)).toBe(15.6);
  });

  it('reproduces the retail column from the same ladder, with no multiplier passed in', () => {
    expect(at(1, 40)).toBe(40);
    expect(at(5, 40)).toBe(34);
    expect(at(10, 40)).toBe(30);
    expect(at(42, 40)).toBe(26);
  });

  it('this week: 42 prongs at wholesale', () => {
    const t = applyQuantityTier({ price: 24, pricing: RETIP, quantity: 42, tiers: LADDER });
    expect(t).toMatchObject({ applied: true, unitPrice: 15.6, listUnitPrice: 24, label: '20+', discountPerUnit: 8.4 });
    expect(round(t.unitPrice * 42)).toBe(655.2);
  });
});

/**
 * The ladder has to work on the rest of the catalog too (owner, 2026-09-29: "should be applicable to
 * other tasks, not just laser welding"). Setting twenty stones has no machine to compress, so a
 * volume price there comes out of MARGIN — deliberately, and never out of the bench's time.
 */
describe('tasks with no machine', () => {
  // Stone setting: 0.7 h labor, no tool. Wholesale ×1.2 → $42.
  const laborOnly = { baseCost: 35, toolDepreciationCost: 0, wholesalePrice: 42 };

  it('gets nothing from a tool-only ladder — there is no machine to give back', () => {
    expect(applyQuantityTier({ price: 42, pricing: laborOnly, quantity: 50, tiers: LADDER })).toMatchObject({
      applied: false, unitPrice: 42,
    });
  });

  it('gets a volume price once a tier gives up margin, and labor still survives it', () => {
    const withMargin = [{ minQty: 1, marginPct: 100 }, { minQty: 20, toolPct: 100, marginPct: 50 }];
    const t = applyQuantityTier({ price: 42, pricing: laborOnly, quantity: 25, tiers: withMargin });

    // Markup halved: 35 × (1 + 0.2 × 0.5) = $38.50 — still above the $35 of bench time in it.
    expect(t).toMatchObject({ applied: true, unitPrice: 38.5, discountPerUnit: 3.5 });
    expect(t.unitPrice).toBeGreaterThan(laborOnly.baseCost);
  });

  it('cannot be driven below cost even by giving away all of the margin', () => {
    const noMargin = [{ minQty: 1, marginPct: 0 }];
    const t = applyQuantityTier({ price: 42, pricing: laborOnly, quantity: 1, tiers: noMargin });
    expect(t.unitPrice).toBe(35); // exactly the labor, never less
  });

  it('both levers together on a machine task', () => {
    const both = [{ minQty: 20, toolPct: 30, marginPct: 50 }];
    // cost 20 − 7 = 13; markup 1.2 → 1.1 → $14.30
    expect(applyQuantityTier({ price: 24, pricing: RETIP, quantity: 42, tiers: both }).unitPrice).toBe(14.3);
  });
});

describe('what a tier must never touch', () => {

  it('only ever reduces the tool share, so labor + materials survive at any quantity', () => {
    // $10 labor + $10 tool + $30 of gold, wholesale ×1.2 → $60.
    const withMetal = { baseCost: 50, toolDepreciationCost: 10, wholesalePrice: 60 };
    const t = applyQuantityTier({ price: 60, pricing: withMetal, quantity: 42, tiers: LADDER });
    // Adjusted base 43 of 50 → $51.60. The $30 of gold is untouched.
    expect(t.unitPrice).toBe(51.6);
  });

  it('reports no discount rather than a zero one, and never inflates a price', () => {
    expect(applyQuantityTier({ price: 24, pricing: RETIP, quantity: 2, tiers: LADDER }).applied).toBe(false);
    expect(applyQuantityTier({ price: 24, pricing: RETIP, quantity: 42, tiers: [{ minQty: 1, toolPct: 100 }] }).applied).toBe(false);
    expect(applyQuantityTier({ price: 0, pricing: RETIP, quantity: 42, tiers: LADDER }).unitPrice).toBe(0);
    expect(applyQuantityTier({ price: 24, pricing: null, quantity: 42, tiers: LADDER }).unitPrice).toBe(24);
  });
});

function round(n) {
  return Math.round(n * 100) / 100;
}
