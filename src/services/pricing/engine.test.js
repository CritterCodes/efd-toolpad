import { describe, it, expect } from 'vitest';
import {
  resolvePricingSettings, priceTask, metalKey, variantKey, unitPriceFor, cannotPriceMessage,
  PricingError, CANNOT_PRICE, REQUIRED_PRICING_SETTINGS,
} from './engine';

/**
 * THE pricing engine (owner, 2026-09-30: "Prices should always be calculated the same … If it can't be
 * calculated, it doesn't show … no fallback … No exceptions."). A parity run against every live task in
 * every metal at quantities 1/5/10/20 matched the old engine on all 1,052 price points; these tests pin
 * the rules that produced that, and the cases where the new engine refuses instead of guessing.
 */

// Production's settings on 2026-09-30.
const ADMIN = {
  pricing: {
    wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25,
    wholesaleMarkup: 1.2, rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095,
    minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
    quantityTiers: [
      { minQty: 1, toolPct: 100, marginPct: 100 }, { minQty: 5, toolPct: 70, marginPct: 100 },
      { minQty: 10, toolPct: 50, marginPct: 100 }, { minQty: 20, toolPct: 30, marginPct: 100 },
    ],
  },
};
const settings = resolvePricingSettings(ADMIN);

const SOLDER = {
  _id: 'm-solder', displayName: 'Hard Solder', isMetalDependent: true, portionsPerUnit: 30,
  stullerProducts: [
    { metalType: 'yellow_gold', karat: '14K', stullerPrice: 134.55 },
    { metalType: 'yellow_gold', karat: '18K', stullerPrice: 180 },
    { metalType: 'sterling_silver', karat: '925', stullerPrice: 12, portionsPerUnit: 60 },
  ],
};
const sizeDown = {
  title: 'Size Down',
  processes: [{ name: 'Size down', laborHours: 0.3, quantity: 1, skillLevel: '' }],
  materials: [{ materialId: 'm-solder', quantity: 1 }],
  tools: [],
  minimumPrice: 40,
};
const laserWeld = {
  title: 'Laser Weld',
  processes: [{ name: 'Weld', laborHours: 0.1, quantity: 1 }],
  materials: [],
  tools: [{ toolId: 't-laser', costPerUse: 7 }],
};

describe('settings — required, never defaulted', () => {
  it('reads production settings into one retail multiplier', () => {
    expect(settings.wage).toBe(50);
    expect(settings.retailMultiplier).toBe(2);
    expect(settings.wholesaleMarkup).toBe(1.2);
    expect(settings.quantityTiers).toHaveLength(4);
  });

  it('refuses when settings did not load at all', () => {
    expect(() => resolvePricingSettings(undefined)).toThrow(PricingError);
    expect(() => resolvePricingSettings({})).toThrow(/did not load/);
  });

  it('names every missing or invalid field instead of substituting one', () => {
    const broken = { pricing: { ...ADMIN.pricing, wage: undefined, wholesaleMarkup: 0, taxRate: '' } };
    try {
      resolvePricingSettings(broken);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('SETTINGS_INCOMPLETE');
      expect(e.details.missing).toEqual(['wage', 'wholesaleMarkup', 'taxRate']);
    }
  });

  it('takes a real zero as zero — a zero fee is not "use the default"', () => {
    const s = resolvePricingSettings({ pricing: { ...ADMIN.pricing, administrativeFee: 0, businessFee: 0, consumablesFee: 0 } });
    expect(s.retailMultiplier).toBe(1); // no hidden 2.0 floor either
  });

  it('knows which settings it requires', () => {
    expect(REQUIRED_PRICING_SETTINGS).toContain('wage');
    expect(REQUIRED_PRICING_SETTINGS).toContain('deliveryFee');
    expect(REQUIRED_PRICING_SETTINGS).toContain('taxRate');
  });

  it('priceTask refuses to run on anything but resolved settings', () => {
    expect(() => priceTask({ task: sizeDown, settings: ADMIN.pricing })).toThrow(PricingError);
    expect(() => priceTask({ task: sizeDown, settings: { ...settings } })).toThrow(PricingError); // a copy isn't resolved
    expect(() => priceTask({ task: sizeDown })).toThrow(PricingError);
  });
});

describe('one metal key', () => {
  it('builds the same key from intake fields, a string, or a Stuller variant', () => {
    expect(metalKey({ metalType: 'gold', goldColor: 'yellow', karat: '14k' })).toBe('yellow_gold_14k');
    expect(metalKey({ metalType: 'platinum', karat: '950' })).toBe('platinum_950');
    expect(metalKey('Sterling_Silver_925')).toBe('sterling_silver_925');
    expect(variantKey({ metalType: 'yellow_gold', karat: '14K' })).toBe('yellow_gold_14k');
    expect(variantKey({ metalType: 'platinum', karat: '950' })).toBe('platinum_950');
  });

  it('has no key for gold without a color, or nothing at all', () => {
    expect(metalKey({ metalType: 'gold', karat: '14k' })).toBeNull();
    expect(metalKey(null)).toBeNull();
  });
});

describe('pricing a task', () => {
  it('prices labor at the wage, materials for the metal, and applies the minimum', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: 'yellow_gold_14k' });
    expect(r.ok).toBe(true);
    expect(r.laborCost).toBe(15);                // 0.3 h × $50
    expect(r.materialsCost).toBe(4.49);          // $134.55 ÷ 30 portions, to the cent
    expect(r.baseCost).toBe(19.49);
    expect(r.retail.listUnit).toBe(40);          // $38.98 is under the $40 minimum
    expect(r.wholesale.listUnit).toBe(23.39);    // $19.49 × 1.2
  });

  it('uses the variant\'s own portions when it has them', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: 'sterling_silver_925' });
    expect(r.materialsCost).toBe(0.2);           // $12 ÷ 60
  });

  it('never applies a skill factor — labor is the wage', () => {
    const skilled = { ...sizeDown, minimumPrice: 0, processes: [{ laborHours: 1, quantity: 1, skillLevel: 'expert' }], materials: [] };
    expect(priceTask({ task: skilled, settings }).laborCost).toBe(50);
  });

  it('cycles up to the next karat of the same color when the exact one is not stocked', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: 'yellow_gold_10k' });
    expect(r.ok).toBe(true);
    expect(r.substitutions).toEqual([{ material: 'Hard Solder', requested: 'yellow_gold_10k', used: 'yellow_gold_14k' }]);
  });

  it('prices tools, and the volume tier gives back part of the machine share', () => {
    const one = priceTask({ task: laserWeld, settings, metal: null, quantity: 1 });
    const twenty = priceTask({ task: laserWeld, settings, metal: null, quantity: 20 });
    expect(one.retail.unit).toBe(24);            // ($5 labor + $7 tool) × 2
    expect(twenty.retail.unit).toBe(14.2);       // tool at 30%: ($5 + $7 × 0.3) × 2 = $7.10 × 2
    expect(twenty.retail.tier).toMatchObject({ minQty: 20 });
    expect(twenty.retail.listUnit).toBe(24);
  });

  it('honors an override and a minimum labor price', () => {
    expect(priceTask({ task: { ...laserWeld, priceOverride: 99 }, settings }).retail.listUnit).toBe(99);
    expect(priceTask({ task: { ...laserWeld, minimumLaborPrice: 20 }, settings }).laborCost).toBe(20);
  });

  it('has no rounding beyond the cent', () => {
    const odd = { processes: [{ laborHours: 0.123, quantity: 1 }], materials: [] };
    expect(priceTask({ task: odd, settings }).retail.listUnit).toBe(12.3); // not $10 or $15
  });
});

describe('when it cannot price, it says so — never a guess', () => {
  it('needs a metal when a material depends on one', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: null });
    expect(r).toMatchObject({ ok: false, reason: CANNOT_PRICE.METAL_REQUIRED, detail: 'Hard Solder' });
    expect(cannotPriceMessage(r)).toMatch(/Choose a metal/);
  });

  it('refuses a metal the material is not stocked in, instead of charging $0 for it', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: 'platinum_950' });
    expect(r).toMatchObject({ ok: false, reason: CANNOT_PRICE.UNMATCHED_MATERIAL });
  });

  it('refuses a material missing from the catalog', () => {
    const r = priceTask({ task: sizeDown, settings, materials: [], metal: 'yellow_gold_14k' });
    expect(r).toMatchObject({ ok: false, reason: CANNOT_PRICE.UNKNOWN_MATERIAL });
  });

  it('refuses a task with nothing in it', () => {
    expect(priceTask({ task: { processes: [], materials: [] }, settings })).toMatchObject({ ok: false, reason: CANNOT_PRICE.NO_COST });
    expect(priceTask({ task: null, settings })).toMatchObject({ ok: false, reason: CANNOT_PRICE.BAD_TASK });
  });

  it('gives no unit price for a refusal', () => {
    expect(unitPriceFor(priceTask({ task: sizeDown, settings, materials: [SOLDER] }))).toBeNull();
    const ok = priceTask({ task: sizeDown, settings, materials: [SOLDER], metal: 'yellow_gold_14k' });
    expect(unitPriceFor(ok, 'retail')).toBe(40);
    expect(unitPriceFor(ok, 'wholesale')).toBe(23.39);
  });
});

describe('quantity', () => {
  it('multiplies every material by its quantity, including inside a process', () => {
    const task = {
      processes: [{ laborHours: 0.1, quantity: 2, materials: [{ ...SOLDER, quantity: 1 }] }],
      materials: [{ materialId: 'm-solder', quantity: 3 }],
    };
    const r = priceTask({ task, settings, materials: [SOLDER], metal: 'yellow_gold_14k' });
    expect(r.laborHours).toBe(0.2);
    expect(r.materialsCost).toBeCloseTo(4.49 * 2 + 4.49 * 3, 2);
  });
});
