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
  return { ...actual, requireRepairOpsAny: mocks.requireRepairOpsAny };
});

const { POST: requestAction } = await import('./request-action/route.js');
const { POST: shipBack } = await import('./ship-back/route.js');
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

describe('ship-back (outbound)', () => {
  const completed = { repairID: 'r1', status: 'COMPLETED', userID: 'ws-marlen' };
  const inProgress = { repairID: 'r2', status: 'IN PROGRESS', userID: 'ws-marlen' };

  const stubFind = (rows) => mocks.find.mockReturnValue({ toArray: async () => rows });

  beforeEach(() => {
    mocks.requireRepairOpsAny.mockResolvedValue({ session: adminSession, errorResponse: null });
  });

  it('requires a tracking number', async () => {
    const res = await shipBack(req({ repairIDs: ['r1'], carrier: 'UPS' }));
    expect(res.status).toBe(400);
  });

  it('ships completed repairs: DELIVERY BATCHED + outboundShipment + owner notified with tracking', async () => {
    stubFind([completed]);
    const res = await shipBack(req({ repairIDs: ['r1'], carrier: 'FedEx', trackingNumber: 'FX123' }));
    const body = await res.json();
    expect(body.shipped).toBe(1);

    const [filter, update] = mocks.updateMany.mock.calls[0];
    expect(filter.repairID.$in).toEqual(['r1']);
    expect(update.$set.status).toBe(REPAIR_STATUS.DELIVERY_BATCHED);
    expect(update.$set.outboundShipment).toMatchObject({ carrier: 'FedEx', trackingNumber: 'FX123' });

    const notif = mocks.createNotification.mock.calls[0][0];
    expect(notif.userId).toBe('ws-marlen'); // the OWNER, not admin
    expect(notif.message).toContain('FX123');
  });

  it('REFUSES an unfinished repair by name instead of silently shipping a subset', async () => {
    stubFind([completed, inProgress]);
    const res = await shipBack(req({ repairIDs: ['r1', 'r2'], trackingNumber: 'FX1' }));
    const body = await res.json();
    expect(body.shipped).toBe(1);
    expect(body.refused).toEqual([{ repairID: 'r2', reason: expect.stringContaining('IN PROGRESS') }]);
    // Only the completed one is in the update filter.
    expect(mocks.updateMany.mock.calls[0][0].repairID.$in).toEqual(['r1']);
  });

  it('is staff-gated — the guard result is honored', async () => {
    mocks.requireRepairOpsAny.mockResolvedValue({ session: null, errorResponse: new Response(null, { status: 403 }) });
    const res = await shipBack(req({ repairIDs: ['r1'], trackingNumber: 'X' }));
    expect(res.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
