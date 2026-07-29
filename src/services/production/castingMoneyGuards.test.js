import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Regression coverage for the CASTING MONEY GUARDS — the boundary that decides what an artisan gets
 * billed. It previously shipped protected only by code reading, and the bug it closes was silent:
 * `actualCost: '1e999'` → Infinity → JSON `null` → `Number(null) === 0` → the casting was RECEIVED
 * AT $0 (zero COGS on every piece, a $0 charge) while reporting success.
 *
 * `0` must stay ACCEPTED (a genuinely free/comped casting); everything missing, non-numeric,
 * non-finite or negative must THROW before any COGS is written.
 */

const state = { batch: null, updates: [], materials: [] };

vi.mock('@/app/api/castingBatches/model', () => ({
  default: {
    findById: async () => state.batch,
    updateById: async (batchId, patch) => { state.updates.push(patch); return { ...state.batch, ...patch }; },
  },
  CASTING_STATUS: {
    NEEDS_ORDERING: 'needs_ordering', ORDERED: 'ordered', RECEIVED: 'received',
    DELIVERED: 'delivered', DISPUTED: 'disputed', ACCEPTED: 'accepted', CANCELLED: 'cancelled',
  },
}));
vi.mock('@/app/api/pieces/model', () => ({
  default: { upsertMaterialByCategory: async (pieceID, category, material) => { state.materials.push({ pieceID, category, material }); } },
}));
vi.mock('@/services/production/workOrderPricing', () => ({
  getWorkOrderMarkupMultiplier: async () => 1.5,
  applyWorkOrderMarkup: (cost, m) => Math.round((Number(cost) || 0) * m * 100) / 100,
  DEFAULT_WO_MARKUP: 1.5,
}));

const load = async () => import('@/services/production/castingBoard');

beforeEach(() => {
  state.batch = { batchId: 'b1', status: 'ordered', pieceIDs: ['p1', 'p2'], estCost: 250, vendor: 'Carrera' };
  state.updates = [];
  state.materials = [];
});

describe('markCastingReceived — actualCost shape guard', () => {
  const accepted = [['0 (a free casting must still work)', 0], ['"0"', '0'], ['12.5', 12.5], ['"12.5"', '12.5']];
  it.each(accepted)('ACCEPTS %s', async (_label, value) => {
    const { markCastingReceived } = await load();
    await expect(markCastingReceived({ batchId: 'b1', actualCost: value })).resolves.toBeTruthy();
    expect(state.materials).toHaveLength(2);          // COGS split onto both pieces
  });

  const rejected = [
    ['null', null], ['undefined', undefined], ['empty string', ''], ['whitespace', '   '],
    ['negative', -1], ['"abc"', 'abc'], ['Infinity', Infinity], ['"1e999" (the original bug)', '1e999'],
    ['NaN', NaN], ['[]', []], ['{}', {}], ['true', true],
  ];
  it.each(rejected)('REJECTS %s and writes NO COGS', async (_label, value) => {
    const { markCastingReceived } = await load();
    await expect(markCastingReceived({ batchId: 'b1', actualCost: value })).rejects.toThrow(/non-negative number/);
    expect(state.materials).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it('charges the vendor cost AT COST (no markup) and gates shipping', async () => {
    const { markCastingReceived } = await load();
    await markCastingReceived({ batchId: 'b1', actualCost: 100 });
    const patch = state.updates.at(-1);
    expect(patch.actualCost).toBe(100);
    // Reimbursement, not a sale: charge === cost. The wholesale-markup mock in this file is 1.5, so
    // a marked-up amount would read 150 — this pins the 2026-07-29 no-markup-on-Carrera decision.
    expect(patch.charge).toMatchObject({ amount: 100, paid: false, passthrough: true, markupMultiplier: null });
    expect(patch.shippingGated).toBe(true);
  });
});

describe('markCastingOrdered — estCost shape guard', () => {
  beforeEach(() => { state.batch = { ...state.batch, status: 'needs_ordering' }; });

  it.each([['"abc"', 'abc'], ['Infinity', Infinity], ['negative', -5], ['NaN', NaN], ['{}', {}]])(
    'keeps the existing estimate when given %s', async (_label, value) => {
      const { markCastingOrdered } = await load();
      await markCastingOrdered({ batchId: 'b1', vendor: 'Carrera', estCost: value });
      expect(state.updates.at(-1).estCost).toBe(250);   // unchanged, never NaN/Infinity
    },
  );

  it.each([['0', 0], ['420', 420], ['"420.50"', '420.50']])('accepts %s', async (_label, value) => {
    const { markCastingOrdered } = await load();
    await markCastingOrdered({ batchId: 'b1', estCost: value });
    expect(state.updates.at(-1).estCost).toBe(Number(value));
  });
});
