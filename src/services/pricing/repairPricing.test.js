import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePricingSettings } from './engine';
import { repairMetal, honorTicketLines } from './repairLines';

/**
 * The server prices what it saves (EFD-DEFECTS P12). The browser can send any number; only the
 * engine's is stored, and the only browser number that survives is one already on the saved ticket.
 */
const settings = resolvePricingSettings({
  pricing: {
    wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25, wholesaleMarkup: 1.2,
    rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095, minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
    quantityTiers: [{ minQty: 1, toolPct: 100, marginPct: 100 }],
  },
});
const SOLDER = {
  _id: 'm-solder', displayName: 'Hard Solder', isMetalDependent: true, portionsPerUnit: 30,
  stullerProducts: [{ metalType: 'yellow_gold', karat: '14K', stullerPrice: 134.55 }],
};
const sizeDown = { _id: 't-size', title: 'Size Down', processes: [{ laborHours: 0.3, quantity: 1 }], materials: [{ materialId: 'm-solder', quantity: 1 }] };

const mocks = vi.hoisted(() => ({ users: vi.fn(async () => null) }));
vi.mock('./catalog', () => ({ loadPricingContext: vi.fn(async () => ({ settings, materials: [SOLDER], tools: [], metals: ['yellow_gold_14k'] })) }));
vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection: (name) => (name === 'tasks'
    ? { find: () => ({ toArray: async () => [sizeDown] }) }
    : { findOne: mocks.users }) })) },
}));

const { priceRepairForSave, priceRepairWithAddedMaterial } = await import('./repairPricing');

beforeEach(() => { mocks.users.mockResolvedValue(null); });

describe('repairMetal', () => {
  it('reads the metal the create route folds into metalType, and the form\'s own', () => {
    expect(repairMetal({ metalType: 'gold - 14k', goldColor: 'yellow' })).toEqual({ metalType: 'gold', karat: '14k', goldColor: 'yellow' });
    expect(repairMetal({ metalType: 'Gold', karat: '14k', goldColor: 'white' })).toEqual({ metalType: 'gold', karat: '14k', goldColor: 'white' });
  });
});

describe('honorTicketLines', () => {
  const saved = [{ id: 1, price: 30, quantity: 1 }];
  it('keeps a ticket line only when it is unchanged and the context is the same', () => {
    expect(honorTicketLines([{ id: 1, price: 30, quantity: 1, ticketPrice: true }], saved, { sameContext: true })[0].ticketPrice).toBe(true);
  });
  it('re-prices a line whose price or quantity was changed — a forged price is never kept', () => {
    expect(honorTicketLines([{ id: 1, price: 1, quantity: 1, ticketPrice: true }], saved, { sameContext: true })[0].ticketPrice).toBeUndefined();
    expect(honorTicketLines([{ id: 1, price: 30, quantity: 2, ticketPrice: true }], saved, { sameContext: true })[0].ticketPrice).toBeUndefined();
    expect(honorTicketLines([{ id: 9, price: 30, quantity: 1, ticketPrice: true }], saved, { sameContext: true })[0].ticketPrice).toBeUndefined();
  });
  it('re-prices every line when the metal or billing changed', () => {
    expect(honorTicketLines([{ id: 1, price: 30, quantity: 1, ticketPrice: true }], saved, { sameContext: false })[0].ticketPrice).toBeUndefined();
  });
});

describe('priceRepairForSave', () => {
  const ticket = (over = {}) => ({
    metalType: 'gold - 14k', goldColor: 'yellow', isWholesale: false, includeTax: true,
    tasks: [{ ...sizeDown, id: 1, quantity: 1, price: 0.01 }], materials: [], customLineItems: [],
    totalCost: 0.01, subtotal: 0.01, ...over,
  });

  it("overwrites the browser's prices and totals with the engine's", async () => {
    const out = await priceRepairForSave(ticket());
    expect(out.tasks[0].price).toBe(38.98);
    expect(out).toMatchObject({ subtotal: 38.98, taxRate: 0.095, taxAmount: 3.7, totalCost: 42.68 });
  });

  it('keeps an unchanged line of a saved ticket at its written price', async () => {
    const saved = ticket({ tasks: [{ ...sizeDown, id: 1, quantity: 1, price: 30 }] });
    const out = await priceRepairForSave(ticket({ tasks: [{ ...sizeDown, id: 1, quantity: 1, price: 30, ticketPrice: true }] }), { saved });
    expect(out.tasks[0].price).toBe(30);
    expect(out.tasks[0].ticketPrice).toBeUndefined(); // the mark is never stored
  });

  it("refuses a line it can't price — and a store's quote request is allowed through", async () => {
    await expect(priceRepairForSave(ticket({ metalType: '', goldColor: '' }))).rejects.toMatchObject({ name: 'PricingError', code: 'UNPRICED' });
    await expect(priceRepairForSave(ticket({ metalType: '', goldColor: '', isWholesale: true }), { quoteRequested: true })).resolves.toBeTruthy();
  });

  it("prices a store's resale from the store's own markup", async () => {
    mocks.users.mockResolvedValue({ wholesalerPricingSettings: { retailMarkupMultiplier: 2 } });
    const out = await priceRepairForSave(ticket({ isWholesale: true, storeId: 'ws-marlen', includeTax: false }));
    expect(out.tasks[0]).toMatchObject({ price: 23.39, retailPrice: 46.78 });
    expect(out.taxAmount).toBe(0);
  });

  it('adding a part keeps every saved line at its price, prices the part, and re-totals', async () => {
    const saved = ticket({ tasks: [{ ...sizeDown, quantity: 1, price: 30 }], isRush: true }); // an older line: no id
    const out = await priceRepairWithAddedMaterial(saved, { id: 'p1', isStullerItem: true, stullerPrice: 40, quantity: 1, name: 'Head' });
    expect(out.tasks[0].price).toBe(30);
    expect(out.materials[0].price).toBe(80);
    expect(out).toMatchObject({ subtotal: 110, rushFee: 55 }); // the rush fee follows the new subtotal
  });

  it('a part typed in by hand keeps its typed price', async () => {
    const out = await priceRepairWithAddedMaterial(ticket({ tasks: [] }), { id: 'p2', category: 'manual_material', isStullerItem: false, price: 12, quantity: 2, name: 'Spring bar' });
    expect(out.materials[0].price).toBe(12);
    expect(out.subtotal).toBe(24);
  });
});
