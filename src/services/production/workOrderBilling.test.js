import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * WORK-ORDER COMPLETION BILLING (U-BILL-3).
 *
 * `billWorkOrder` shipped in S5 with ZERO callers — work orders passed QC, labor became
 * payroll-payable, and nobody was ever charged. EFD paid the bench and invoiced nothing. These tests
 * pin the money rules of the caller.
 *
 * The four ways this could lose or misdirect money, each with a test below:
 *  1. billing the PIECE total instead of the work order's own labor → charges the whole piece once per
 *     work order on it
 *  2. billing `payer:'self'` labor → charges an artisan for their own hands
 *  3. billing materials here → double-bills casting, which is already invoiced at cost at receipt
 *  4. billing the wrong party → the owning artisan is the drop owner, else the design's primary
 *     artisan, and it must match what `laborPayer` used to decide `self`
 */

const state = { wo: null, logs: [], piece: null, design: null, drop: null, users: {}, billed: [] };

vi.mock('@/app/api/workOrders/model', () => ({
  default: { findByID: async () => state.wo },
  WORK_ORDER_SOURCE: {
    REPAIR: 'repair', PRODUCTION_PIECE: 'production_piece', CUSTOM_PIECE: 'custom_piece',
    SALE_SERVICE: 'sale_service', CAD_REQUEST: 'cad_request',
  },
}));
vi.mock('@/app/api/repairLaborLogs/model', () => ({
  default: { findByWorkOrder: async () => state.logs },
}));
vi.mock('@/app/api/pieces/model', () => ({ default: { findById: async () => state.piece } }));
vi.mock('@/app/api/designs/model', () => ({ default: { findById: async () => state.design } }));
vi.mock('@/app/api/drops/model', () => ({ default: { findById: async () => state.drop } }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: async ({ userID }) => state.users[userID] || null }) }) },
}));
vi.mock('@/services/production/artisanBilling', () => ({
  isEfdSelf: async (id) => ['admin', 'dev', 'staff'].includes(state.users[id]?.role),
  billWorkOrder: async (args) => {
    state.billed.push(args);
    // Mirror the real guard: nothing owed → no invoice.
    if (!(Number(args.labor) + Number(args.materials || 0) > 0)) return null;
    return { invoiceID: 'ainv-wo-1', amount: Number(args.labor) * 1.5 };
  },
}));

const { billCompletedWorkOrder, billableLabor } = await import('@/services/production/workOrderBilling');

const log = (over = {}) => ({ workOrderID: 'wo-1', payer: 'efd', creditedValue: 100, pendingQc: false, ...over });

beforeEach(() => {
  state.wo = { workOrderID: 'wo-1', sourceType: 'production_piece', sourceID: 'p-1', runId: 'r-1', title: 'Set stones' };
  state.logs = [log()];
  state.piece = { pieceID: 'p-1', designID: 'd-1', dropId: null };
  state.design = { designID: 'd-1', primaryArtisanId: 'u-artisan' };
  state.drop = null;
  state.users = { 'u-artisan': { email: 'a@t.test', role: 'artisan' }, 'u-owner': { email: 'o@t.test', role: 'admin' } };
  state.billed = [];
});

describe('billableLabor (pure)', () => {
  it('sums EFD-paid, QC-released labor', () => {
    expect(billableLabor([log({ creditedValue: 100 }), log({ creditedValue: 50 })])).toBe(150);
  });

  it('EXCLUDES payer:self — solo work realizes at sale, it is not a bill', () => {
    expect(billableLabor([log({ payer: 'self', creditedValue: 500 })])).toBe(0);
    expect(billableLabor([log({ payer: 'self', creditedValue: 500 }), log({ creditedValue: 40 })])).toBe(40);
  });

  it('EXCLUDES labor still held pending QC', () => {
    expect(billableLabor([log({ pendingQc: true, creditedValue: 900 })])).toBe(0);
  });

  it('treats a missing payer as billable (pre-S2 / repair logs)', () => {
    expect(billableLabor([{ creditedValue: 30 }])).toBe(30);
  });

  it('tolerates junk', () => {
    expect(billableLabor()).toBe(0);
    expect(billableLabor([null, undefined, {}, log({ creditedValue: 'abc' })])).toBe(0);
  });
});

describe('who gets billed', () => {
  it("bills the design's primary artisan, at that WO's labor only", async () => {
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1', createdBy: 'u-staff' });
    expect(res).toMatchObject({ billed: true, invoiceID: 'ainv-wo-1' });
    expect(state.billed[0]).toMatchObject({
      workOrderID: 'wo-1', billedUserID: 'u-artisan', billedEmail: 'a@t.test',
      labor: 100, runId: 'r-1', createdBy: 'u-staff',
    });
  });

  it('an ARTISAN-OWNED DROP wins over the design owner (matches laborPayer)', async () => {
    // Who is billed must agree with who laborPayer called `self`, or one path bills and the other
    // credits the wrong person.
    state.piece = { ...state.piece, dropId: 'drop-1' };   // the drop is only loaded when the piece points at one
    state.drop = { ownerType: 'artisan', ownerId: 'u-dropowner' };
    state.users['u-dropowner'] = { email: 'd@t.test', role: 'artisan' };
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].billedUserID).toBe('u-dropowner');
  });

  it('bills NOBODY for an EFD-owned piece', async () => {
    state.design = { designID: 'd-1' };          // no primaryArtisanId
    state.drop = { ownerType: 'efd', ownerId: null };
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });

  it('bills NOBODY when the owner is EFD staff (EFD does not bill EFD)', async () => {
    state.design = { designID: 'd-1', primaryArtisanId: 'u-owner' };   // role: admin
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res).toMatchObject({ billed: false });
    expect(state.billed).toHaveLength(0);
  });
});

describe('what is billed', () => {
  it('NEVER bills materials here — casting is already invoiced at cost at receipt', async () => {
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].materials).toBe(0);
  });

  it('bills only THIS work order (the model is queried by workOrderID, not by piece)', async () => {
    // Regression guard for the double-charge: computePieceCosts sums the whole PIECE, so billing from
    // that would charge the full piece once per work order on it.
    state.logs = [log({ creditedValue: 60 })];
    await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(state.billed[0].labor).toBe(60);
  });

  it('solo work bills nothing at all', async () => {
    state.logs = [log({ payer: 'self', creditedValue: 300 })];
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });
});

describe('sources that must NOT be artisan-billed', () => {
  it.each([['repair'], ['sale_service'], ['cad_request']])('%s is skipped', async (sourceType) => {
    state.wo = { ...state.wo, sourceType };
    const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
    expect(res.billed).toBe(false);
    expect(state.billed).toHaveLength(0);
  });
});

describe('never throws — QC pass has already committed', () => {
  it('reports a structured error instead of throwing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logs = await import('@/app/api/repairLaborLogs/model');
    const orig = logs.default.findByWorkOrder;
    logs.default.findByWorkOrder = async () => { throw new Error('mongo down'); };
    try {
      const res = await billCompletedWorkOrder({ workOrderID: 'wo-1' });
      expect(res).toMatchObject({ billed: false, error: true });
      expect(res.reason).toContain('mongo down');
    } finally { logs.default.findByWorkOrder = orig; spy.mockRestore(); }
  });

  it('degrades cleanly on a missing work order', async () => {
    state.wo = null;
    await expect(billCompletedWorkOrder({ workOrderID: 'nope' })).resolves.toMatchObject({ billed: false });
  });
});
