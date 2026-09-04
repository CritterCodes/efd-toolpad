import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The wholesale shipping rails, both directions, plus the ownership fix on the
 * shared action endpoint. The dangerous outcomes these pin down:
 *   - one wholesaler moving ANOTHER wholesaler's repairs (the old filter allowed it)
 *   - an in-transit box with no tracking number
 *   - shipping an unfinished repair back to the store
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  updateMany: vi.fn(async () => ({ modifiedCount: 2 })),
  find: vi.fn(),
  createNotification: vi.fn(async () => ({})),
  requireRepairOpsAny: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: () => ({ updateMany: mocks.updateMany, find: mocks.find }),
    })),
  },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: mocks.createNotification },
  CHANNELS: { IN_APP: 'inApp', EMAIL: 'email' },
}));
vi.mock('@/lib/apiAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRepairOpsAny: mocks.requireRepairOpsAny, requireRepairOps: mocks.requireRepairOpsAny };
});

const { POST: requestAction } = await import('./request-action/route.js');
const { POST: shipBack } = await import('./ship-back/route.js');
const { POST: receive } = await import('./receive/route.js');
const { REPAIR_STATUS } = await import('@/services/repairWorkflow');

const req = (body) => ({ json: async () => body });
const wholesalerSession = { user: { role: 'wholesaler', userID: 'ws-marlen', name: 'Marlen Jewelers' } };
const adminSession = { user: { role: 'admin', userID: 'admin-1', name: 'Jacob' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateMany.mockResolvedValue({ modifiedCount: 2 });
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'admin@efd.test';
});

describe('request-action ownership (the fix)', () => {
  it("a wholesaler's updateMany filter is scoped to THEIR repairs", async () => {
    mocks.auth.mockResolvedValue(wholesalerSession);
    await requestAction(req({ repairIDs: ['r1', 'r2'], action: 'pickup' }));

    const filter = mocks.updateMany.mock.calls[0][0];
    // The breach: without this $or, posting guessed IDs moved anyone's repairs.
    expect(filter.$or).toEqual([{ userID: 'ws-marlen' }, { createdBy: 'ws-marlen' }]);
    expect(filter.isWholesale).toBe(true);
  });

  it('admin stays unscoped — they act on behalf of any store', async () => {
    mocks.auth.mockResolvedValue(adminSession);
    await requestAction(req({ repairIDs: ['r1'], action: 'pickup' }));
    expect(mocks.updateMany.mock.calls[0][0].$or).toBeUndefined();
  });
});

describe('request-action ship (inbound)', () => {
  it('REFUSES a shipment without a tracking number', async () => {
    mocks.auth.mockResolvedValue(wholesalerSession);
    const res = await requestAction(req({ repairIDs: ['r1'], action: 'ship', carrier: 'UPS' }));
    expect(res.status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('marks repairs SHIPPED TO SHOP with the shipment recorded, and tells admin the tracking', async () => {
    mocks.auth.mockResolvedValue(wholesalerSession);
    const res = await requestAction(req({ repairIDs: ['r1', 'r2'], action: 'ship', carrier: 'UPS', trackingNumber: '1Z999' }));
    expect(res.status).toBe(200);

    const [filter, update] = mocks.updateMany.mock.calls[0];
    expect(filter.status).toBe(REPAIR_STATUS.PENDING_PICKUP);
    expect(update.$set.status).toBe(REPAIR_STATUS.SHIPPED_TO_SHOP);
    expect(update.$set.inboundShipment).toMatchObject({ carrier: 'UPS', trackingNumber: '1Z999', shippedBy: 'ws-marlen' });

    const notif = mocks.createNotification.mock.calls[0][0];
    expect(notif.message).toContain('1Z999');
  });
});

describe('ship-back (outbound, INVOICE-based)', () => {
  const invoice = (over = {}) => ({
    invoiceID: 'rinv-1', accountType: 'wholesale', clientID: 'ws-marlen',
    status: 'paid', paymentStatus: 'paid', total: 500, remainingBalance: 0,
    repairIDs: ['r1', 'r2'],
    repairSnapshots: [{ repairID: 'r1', description: 'ring' }, { repairID: 'r2', description: 'chain' }],
    ...over,
  });
  // ship-back queries invoices first, repairs second, then users (the notification's
  // recipient resolution — real portal accounts, not invoice.clientID) — per collection.
  const stubFinds = ({ invoices = [], repairs = [], users = [{ userID: 'ws-marlen', email: 'marlen@store.test', firstName: 'Marlen' }] }) => {
    mocks.find.mockReset();
    mocks.find
      .mockReturnValueOnce({ toArray: async () => invoices })
      .mockReturnValueOnce({ projection: undefined, toArray: async () => repairs })
      .mockReturnValue({ toArray: async () => users })
      ;
  };

  beforeEach(() => {
    mocks.requireRepairOpsAny.mockResolvedValue({ session: adminSession, errorResponse: null });
  });

  it('requires a tracking number, and refuses a repairIDs-only payload', async () => {
    expect((await shipBack(req({ invoiceIDs: ['rinv-1'], carrier: 'UPS' }))).status).toBe(400);
    expect((await shipBack(req({ repairIDs: ['r1'], trackingNumber: 'X' }))).status).toBe(400);
  });

  it('ships invoices as one package: repairs + invoices stamped, owner told the tracking', async () => {
    stubFinds({
      invoices: [invoice(), invoice({ invoiceID: 'rinv-2', repairIDs: ['r3'], repairSnapshots: [{ repairID: 'r3', description: 'watch' }] })],
      repairs: [
        { repairID: 'r1', status: 'PAID_CLOSED' },
        { repairID: 'r2', status: 'PAID_CLOSED' },
        { repairID: 'r3', status: 'COMPLETED' },
      ],
    });
    const res = await shipBack(req({ invoiceIDs: ['rinv-1', 'rinv-2'], carrier: 'FedEx', trackingNumber: 'FX123' }));
    const body = await res.json();
    expect(body.shipped).toBe(2);
    // the manifest IS the transfer list: per-invoice repair contents
    expect(body.manifest.invoices.map((i) => i.invoiceID)).toEqual(['rinv-1', 'rinv-2']);
    expect(body.manifest.invoices[0].repairs).toHaveLength(2);
    expect(body.manifest.trackingNumber).toBe('FX123');

    // repairs: status bump only for pre-payment states, shipment stamped on all
    const statusBump = mocks.updateMany.mock.calls[0];
    expect(statusBump[0].status.$in).toEqual([REPAIR_STATUS.COMPLETED, REPAIR_STATUS.READY_FOR_PICKUP]);
    expect(statusBump[1].$set.status).toBe(REPAIR_STATUS.DELIVERY_BATCHED);
    const stampAll = mocks.updateMany.mock.calls[1];
    expect(stampAll[0].repairID.$in.sort()).toEqual(['r1', 'r2', 'r3']);
    expect(stampAll[1].$set.outboundShipment).toMatchObject({ trackingNumber: 'FX123' });
    // invoices stamped too — an invoice can only ship once
    const invStamp = mocks.updateMany.mock.calls[2];
    expect(invStamp[0].invoiceID.$in).toEqual(['rinv-1', 'rinv-2']);
    expect(invStamp[1].$set.outboundShipment).toMatchObject({ trackingNumber: 'FX123' });

    const notif = mocks.createNotification.mock.calls[0][0];
    expect(notif.userId).toBe('ws-marlen');
    // The email leg needs an address — clientID grouping never carried one.
    expect(notif.recipientEmail).toBe('marlen@store.test');
    expect(notif.message).toContain('FX123');
    expect(notif.message).toContain('rinv-1');
  });

  it('PAID_CLOSED repairs ship without their money state being regressed', async () => {
    stubFinds({ invoices: [invoice()], repairs: [
      { repairID: 'r1', status: 'PAID_CLOSED' }, { repairID: 'r2', status: 'PAID_CLOSED' },
    ] });
    const res = await shipBack(req({ invoiceIDs: ['rinv-1'], trackingNumber: 'T1' }));
    expect((await res.json()).shipped).toBe(1);
    // the status-bump filter can never match a PAID_CLOSED repair
    expect(mocks.updateMany.mock.calls[0][0].status.$in).not.toContain('PAID_CLOSED');
  });

  it('refuses an already-shipped invoice BY NAME (one box per invoice)', async () => {
    stubFinds({ invoices: [invoice({ outboundShipment: { trackingNumber: 'OLD1' } })], repairs: [] });
    const body = await (await shipBack(req({ invoiceIDs: ['rinv-1'], trackingNumber: 'T2' }))).json();
    expect(body.shipped).toBe(0);
    expect(body.refused[0].reason).toContain('OLD1');
  });

  it('409s when an invoiced repair is somehow not in a shippable state', async () => {
    stubFinds({ invoices: [invoice()], repairs: [
      { repairID: 'r1', status: 'IN PROGRESS' }, { repairID: 'r2', status: 'COMPLETED' },
    ] });
    const res = await shipBack(req({ invoiceIDs: ['rinv-1'], trackingNumber: 'T3' }));
    expect(res.status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('is staff-gated', async () => {
    mocks.requireRepairOpsAny.mockResolvedValue({ session: null, errorResponse: new Response(null, { status: 403 }) });
    expect((await shipBack(req({ invoiceIDs: ['rinv-1'], trackingNumber: 'X' }))).status).toBe(403);
  });
});

describe('receive notifies the owner their box arrived', () => {
  beforeEach(() => {
    mocks.requireRepairOpsAny.mockResolvedValue({ session: adminSession, errorResponse: null });
  });

  it('one note per owning wholesaler, listing exactly the received repairIDs', async () => {
    mocks.find.mockReturnValue({ toArray: async () => [
      { repairID: 'r1', userID: 'ws-marlen' },
      { repairID: 'r2', userID: 'ws-marlen' },
      { repairID: 'r3', userID: 'ws-rocky' },
    ] });
    const res = await receive(req({ repairIDs: ['r1', 'r2', 'r3'] }));
    expect(res.status).toBe(200);

    const notes = mocks.createNotification.mock.calls.map((c) => c[0]);
    const marlen = notes.find((n) => n.userId === 'ws-marlen');
    const rocky = notes.find((n) => n.userId === 'ws-rocky');
    expect(marlen.message).toContain('r1, r2');
    expect(rocky.message).toContain('r3');
    expect(marlen.type).toBe('wholesale-received');
  });

  it('receiving still succeeds when the notification layer throws', async () => {
    mocks.find.mockReturnValue({ toArray: async () => [{ repairID: 'r1', userID: 'ws-marlen' }] });
    mocks.createNotification.mockRejectedValue(new Error('smtp down'));
    const res = await receive(req({ repairIDs: ['r1'] }));
    expect(res.status).toBe(200);
  });
});
