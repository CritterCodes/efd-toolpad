import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Casting action-route DISPATCH tests.
 *
 * WHY THIS FILE EXISTS: two separate money blockers in U-BILL-1 lived in this route's dispatch, not
 * in the services it calls — `pay` didn't settle the invoice, then `cancel` didn't void it. Both were
 * found by reading, because nothing here was covered: deleting all three side-effect branches left
 * the entire 633-test suite green. Service-level tests can't catch a branch that never runs.
 *
 * So these tests assert the WIRING, with every service mocked: which action triggers which
 * side effect, that the result is reported on the response, and that the authz gates hold.
 */

const castingBoard = {
  markCastingOrdered: vi.fn(async () => ({ status: 'ordered' })),
  markCastingReceived: vi.fn(async () => ({ status: 'received' })),
  markCastingPaid: vi.fn(async () => ({ status: 'received', charge: { paid: true } })),
  markCastingDelivered: vi.fn(async () => ({ status: 'delivered' })),
  disputeCasting: vi.fn(async () => ({ status: 'disputed' })),
  acceptCasting: vi.fn(async () => ({ status: 'accepted' })),
  cancelCastingBatch: vi.fn(async () => ({ status: 'cancelled' })),
};
const settlement = {
  billReceivedCasting: vi.fn(async () => ({ invoiced: true, invoiceID: 'ainv-1', amount: 150 })),
  settleCastingInvoice: vi.fn(async () => ({ settled: true, invoiceID: 'ainv-1' })),
  voidCastingInvoice: vi.fn(async () => ({ voided: true, invoiceID: 'ainv-1' })),
};

let sessionUser = { userID: 'u-staff', role: 'admin' };
let staff = true;
let batch = { batchId: 'cb-1', ownerId: 'u-artisan', status: 'received', charge: { amount: 150, paid: false } };

vi.mock('@/lib/apiAuth', () => ({ requireAuth: async () => ({ session: { user: sessionUser }, errorResponse: null }) }));
vi.mock('@/lib/designPermissions', () => ({ isStaff: () => staff }));
vi.mock('@/app/api/castingBatches/model', () => ({ default: { findById: async () => batch } }));
vi.mock('@/services/production/castingBoard', () => ({ ...castingBoard, CastingError: class CastingError extends Error {} }));
vi.mock('@/services/production/castingVendorOrder', () => ({
  placeVendorCastingOrder: vi.fn(async () => ({ status: 'ordered', emailed: true })),
  CastingOrderError: class CastingOrderError extends Error {},
}));
vi.mock('@/services/production/castingSettlement', () => settlement);

const { POST } = await import('@/app/api/production/casting/[batchId]/[action]/route');

const post = async (action, body = {}) => {
  const req = { json: async () => body };
  const res = await POST(req, { params: Promise.resolve({ batchId: 'cb-1', action }) });
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionUser = { userID: 'u-staff', role: 'admin' };
  staff = true;
  batch = { batchId: 'cb-1', ownerId: 'u-artisan', status: 'received', charge: { amount: 150, paid: false } };
});

describe('every exit from an invoiced state resolves the invoice', () => {
  it('receive → bills the artisan, and reports the invoice on the response', async () => {
    const { status, body } = await post('receive', { actualCost: 100 });
    expect(status).toBe(200);
    expect(settlement.billReceivedCasting).toHaveBeenCalledWith({ batchId: 'cb-1', ownerId: 'u-artisan', createdBy: 'u-staff' });
    expect(body.billing).toMatchObject({ invoiced: true, amount: 150 });
  });

  it('pay → SETTLES the invoice (round-1 blocker: gate cleared, debt left pending → false freeze)', async () => {
    const { body } = await post('pay');
    expect(castingBoard.markCastingPaid).toHaveBeenCalled();
    expect(settlement.settleCastingInvoice).toHaveBeenCalledWith({ batchId: 'cb-1' });
    expect(body.settlement).toMatchObject({ settled: true });
  });

  it('cancel → VOIDS the invoice (round-2 blocker: debt stranded on a written-off casting)', async () => {
    const { body } = await post('cancel');
    expect(castingBoard.cancelCastingBatch).toHaveBeenCalled();
    expect(settlement.voidCastingInvoice).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'cb-1' }));
    expect(body.settlement).toMatchObject({ voided: true });
  });

  it('no OTHER action touches the invoice (only receive/pay/cancel may move money)', async () => {
    for (const action of ['order', 'deliver', 'dispute', 'accept']) {
      vi.clearAllMocks();
      await post(action);
      expect(settlement.billReceivedCasting).not.toHaveBeenCalled();
      expect(settlement.settleCastingInvoice).not.toHaveBeenCalled();
      expect(settlement.voidCastingInvoice).not.toHaveBeenCalled();
    }
  });

  it('a failed side effect is surfaced with a structured flag, not swallowed and not a 500', async () => {
    settlement.voidCastingInvoice.mockResolvedValueOnce({ voided: false, error: true, reason: 'mongo down' });
    const { status, body } = await post('cancel');
    expect(status).toBe(200);                       // the cancel itself committed
    expect(body.settlement).toMatchObject({ error: true, reason: 'mongo down' });
  });
});

describe('authz gates', () => {
  it('refuses an unknown action rather than dispatching an inherited property', async () => {
    for (const action of ['constructor', 'toString', 'nope']) {
      expect((await post(action)).status).toBe(400);
    }
  });

  it('refuses a non-owner artisan (IDOR)', async () => {
    staff = false; sessionUser = { userID: 'u-someone-else', role: 'artisan' };
    expect((await post('accept')).status).toBe(403);
  });

  it('refuses an artisan on staff-only money actions', async () => {
    staff = false; sessionUser = { userID: 'u-artisan', role: 'artisan' };
    for (const action of ['pay', 'receive', 'place-order']) {
      const { status } = await post(action);
      expect(status, `${action} must be staff-only`).toBe(403);
    }
    expect(settlement.settleCastingInvoice).not.toHaveBeenCalled();
  });

  it('refuses an artisan cancelling a batch with an UNPAID charge — they must not void their own debt', async () => {
    staff = false; sessionUser = { userID: 'u-artisan', role: 'artisan' };
    expect((await post('cancel')).status).toBe(403);
    expect(settlement.voidCastingInvoice).not.toHaveBeenCalled();
  });

  it('lets an artisan cancel their own PRE-charge batch (nothing owed, nothing to void)', async () => {
    staff = false; sessionUser = { userID: 'u-artisan', role: 'artisan' };
    batch = { batchId: 'cb-1', ownerId: 'u-artisan', status: 'needs_ordering', charge: { amount: null, paid: false } };
    expect((await post('cancel')).status).toBe(200);
  });

  it('cannot be made to act on another batch by putting batchId in the BODY (IDOR)', async () => {
    await post('pay', { batchId: 'cb-VICTIM', sentBy: 'someone-else' });
    expect(castingBoard.markCastingPaid).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'cb-1', sentBy: 'u-staff' }));
    expect(settlement.settleCastingInvoice).toHaveBeenCalledWith({ batchId: 'cb-1' });
  });
});
