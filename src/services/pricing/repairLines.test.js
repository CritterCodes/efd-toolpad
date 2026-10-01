import { describe, it, expect } from 'vitest';
import { resolvePricingSettings, priceMaterial, pricePart, priceCustomLabor, priceRepairTotals, storeResalePrice } from './engine';
import { priceRepairLines, asTicketLines, releaseTicketPrice } from './repairLines';

/**
 * A whole repair, priced by the engine: every kind of line, the totals, and the refusals. Intake shows
 * exactly this, and the server saves exactly this.
 */

const settings = resolvePricingSettings({
  pricing: {
    wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25,
    wholesaleMarkup: 1.2, rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095,
    minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
    quantityTiers: [{ minQty: 1, toolPct: 100, marginPct: 100 }, { minQty: 5, toolPct: 70, marginPct: 100 }],
  },
});

const SOLDER = {
  _id: 'm-solder', displayName: 'Hard Solder', isMetalDependent: true, portionsPerUnit: 30,
  stullerProducts: [
    { metalType: 'yellow_gold', karat: '14K', stullerPrice: 134.55 },
    { metalType: 'sterling_silver', karat: '925', stullerPrice: 12, portionsPerUnit: 60 },
  ],
};
const POLISH = { _id: 'm-polish', displayName: 'Polishing compound', isMetalDependent: false, estimatedCost: 2 };
const sizeDown = { _id: 't-size', title: 'Size Down', processes: [{ laborHours: 0.3, quantity: 1 }], materials: [{ materialId: 'm-solder', quantity: 1 }] };
const retip = { _id: 't-retip', title: 'Retip', processes: [{ laborHours: 0.2, quantity: 1 }], materials: [], tools: [{ toolId: 'x', costPerUse: 10 }] };

const ctx = { settings, tasks: [sizeDown, retip], materials: [SOLDER, POLISH], tools: [], storeMarkup: 2 };
const gold14 = { metalType: 'gold', karat: '14k', goldColor: 'yellow' };

describe('engine: the other lines', () => {
  it('prices a catalog material by the same unit-cost rule tasks use', () => {
    const r = priceMaterial({ material: SOLDER, settings, metal: gold14 });
    expect(r).toMatchObject({ ok: true, unitCost: 4.49, retail: { unit: 8.98 }, wholesale: { unit: 5.39 } });
    // Silver: the counter's "silver 925" finds the sterling stock (EFD-SILVER-PRICING)
    expect(priceMaterial({ material: SOLDER, settings, metal: { metalType: 'silver', karat: '925' } }).unitCost).toBe(0.2);
  });

  it('refuses a metal-dependent material with no metal, or none stocked — never $0', () => {
    expect(priceMaterial({ material: SOLDER, settings }).reason).toBe('METAL_REQUIRED');
    expect(priceMaterial({ material: SOLDER, settings, metal: { metalType: 'platinum', karat: '950' } }).reason).toBe('UNMATCHED_MATERIAL');
  });

  it('prices a part at cost × the fee multiplier, or × the wholesale markup', () => {
    expect(pricePart({ cost: 40, settings })).toMatchObject({ retail: { unit: 80 }, wholesale: { unit: 48 } });
    expect(pricePart({ cost: 0, settings }).ok).toBe(false);
  });

  it('prices custom labor exactly like a task with those hours', () => {
    const r = priceCustomLabor({ laborHours: 1.5, settings });
    expect(r.retail.unit).toBe(150);
    expect(r.wholesale.unit).toBe(90);
    expect(priceCustomLabor({ laborHours: 0, settings }).ok).toBe(false);
  });

  it('totals: rush, delivery and tax on retail; a store ticket is its lines', () => {
    expect(priceRepairTotals({ subtotal: 100, settings, isRush: true, includeDelivery: true, includeTax: true }))
      .toEqual({ subtotal: 100, rushFee: 50, deliveryFee: 5, taxRate: 0.095, taxAmount: 14.73, total: 169.73 });
    expect(priceRepairTotals({ subtotal: 100, settings, isWholesale: true, isRush: true, includeDelivery: true, includeTax: true }))
      .toEqual({ subtotal: 100, rushFee: 0, deliveryFee: 0, taxRate: 0, taxAmount: 0, total: 100 });
    expect(priceRepairTotals({ subtotal: 100, settings, comped: true }).total).toBe(0);
  });

  it('a store resale price exists only when the store markup loaded', () => {
    expect(storeResalePrice(24, 2)).toBe(48);
    expect(storeResalePrice(24, null)).toBeNull();
  });

  it('every function refuses raw settings', () => {
    expect(() => priceMaterial({ material: POLISH, settings: { wage: 50 } })).toThrow(/resolvePricingSettings/);
    expect(() => priceRepairTotals({ subtotal: 1, settings: {} })).toThrow(/resolvePricingSettings/);
  });
});

describe('priceRepairLines', () => {
  const form = (over = {}) => ({
    ...gold14, isWholesale: false, includeTax: true,
    tasks: [{ ...sizeDown, id: 1, quantity: 1 }],
    materials: [{ ...POLISH, id: 2, quantity: 2 }],
    customLineItems: [{ id: 3, description: 'Chain', price: 20, quantity: 1 }],
    ...over,
  });

  it('prices every line and totals the ticket', () => {
    const r = priceRepairLines(form(), ctx);
    // Size Down 14k: $15 labor + $4.49 solder = $19.49 × 2 = $38.98
    expect(r.tasks[0]).toMatchObject({ price: 38.98, retailPrice: 38.98, pricingError: null, laborHours: 0.3 });
    expect(r.tasks[0].pricing.totalLaborHours).toBe(0.3); // labor credit at QC reads this
    expect(r.materials[0]).toMatchObject({ price: 4, retailPrice: 4 });
    expect(r.totals).toMatchObject({ subtotal: 66.98, taxRate: 0.095 });
    expect(r.unpriced).toEqual([]);
  });

  it('IGNORES a price carried on the line — the line is always re-derived', () => {
    const r = priceRepairLines(form({ tasks: [{ ...sizeDown, id: 1, quantity: 1, price: 999, pricing: { retailPrice: 999 } }] }), ctx);
    expect(r.tasks[0].price).toBe(38.98);
  });

  it('prices from the CATALOG recipe when the task is found there', () => {
    const stale = { ...sizeDown, id: 1, quantity: 1, processes: [{ laborHours: 5, quantity: 1 }] };
    expect(priceRepairLines(form({ tasks: [stale] }), ctx).tasks[0].price).toBe(38.98);
  });

  it('a store pays wholesale and its receipts show its own markup', () => {
    const r = priceRepairLines(form({ isWholesale: true }), ctx);
    expect(r.tasks[0]).toMatchObject({ price: 23.39, retailPrice: 46.78 });
    expect(r.totals.taxAmount).toBe(0);
    const noMarkup = priceRepairLines(form({ isWholesale: true }), { ...ctx, storeMarkup: null });
    expect(noMarkup.tasks[0].retailPrice).toBeNull();
  });

  it('a metal change re-prices the ticket, and the quantity picks the tier', () => {
    const silver = priceRepairLines(form({ metalType: 'silver', karat: '925', goldColor: '' }), ctx);
    expect(silver.tasks[0].price).toBe(30.4); // $15 + $0.20, × 2
    const five = priceRepairLines(form({ tasks: [{ ...retip, id: 9, quantity: 5 }] }), ctx);
    expect(five.tasks[0].listUnitPrice).toBe(40);
    expect(five.tasks[0].price).toBeLessThan(40);
    expect(five.tasks[0].quantityTier).toMatchObject({ minQty: 5 });
  });

  it("a line that can't be priced shows nothing, says why, and adds nothing", () => {
    const r = priceRepairLines(form({ metalType: '', karat: '', goldColor: '' }), ctx);
    expect(r.tasks[0]).toMatchObject({ price: null, retailPrice: null });
    expect(r.tasks[0].pricingError).toMatch(/Choose a metal/);
    expect(r.unpriced).toHaveLength(1);
    expect(r.totals.subtotal).toBe(28);
  });

  it('custom labor follows its hours; a typed override is kept', () => {
    const labor = { id: 5, isCustomLabor: true, title: 'Rebuild', laborHours: 1, quantity: 1 };
    expect(priceRepairLines(form({ tasks: [labor] }), ctx).tasks[0].price).toBe(100);
    const overridden = priceRepairLines(form({ tasks: [{ ...labor, price: 80, priceOverridden: true }] }), ctx);
    expect(overridden.tasks[0]).toMatchObject({ price: 80, listUnitPrice: 100 });
  });

  it('a Stuller part is priced from its cost for who the ticket is for', () => {
    const part = { id: 6, isStullerItem: true, stullerPrice: 40, quantity: 1 };
    expect(priceRepairLines(form({ materials: [part] }), ctx).materials[0].price).toBe(80);
    expect(priceRepairLines(form({ materials: [part], isWholesale: true }), ctx).materials[0].price).toBe(48);
  });

  it("a saved ticket's lines keep their price until the line is changed", () => {
    const saved = asTicketLines([{ ...sizeDown, id: 1, quantity: 1, price: 30 }]);
    expect(priceRepairLines(form({ tasks: saved }), ctx).tasks[0].price).toBe(30);
    expect(priceRepairLines(form({ tasks: saved.map(releaseTicketPrice) }), ctx).tasks[0].price).toBe(38.98);
  });

  it('a comped ticket totals $0', () => {
    expect(priceRepairLines(form({ compRepair: true }), ctx).totals.total).toBe(0);
  });
});
