import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Creation hardening for wholesaler sessions. The server decides where a
 * wholesaler's repair enters the pipeline and whose ledger it bills to — a crafted
 * POST must not inject items into bench queues (or ship-back eligibility) for
 * goods the shop never received, nor drop itself out of the wholesale queries.
 */

const mocks = vi.hoisted(() => ({
  requireRepairsAccess: vi.fn(),
  // The store record the route resolves the BUSINESS name from (Greers Pawn as it sat in prod).
  findUser: vi.fn(async () => ({ firstName: 'Sam', lastName: 'Johnson', wholesaleApplication: { businessName: 'Greers Pawn' } })),
  createRepair: vi.fn(async (data) => ({ repairID: 'r-new', ...data })),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/utils/s3.util', () => ({ uploadRepairImage: vi.fn() }));
vi.mock('@/app/api/repairLaborLogs/model', () => ({ default: { findByRepair: vi.fn(async () => []), create: vi.fn() } }));
vi.mock('@/app/api/repairLaborLogs/utils', () => ({
  calculateRepairChargeTotal: vi.fn(() => 0),
  calculateRepairLaborHours: vi.fn(() => 0),
  getLaborRateSnapshotForUser: vi.fn(async () => 0),
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn(async () => ({})) },
  notifyAllAdmins: vi.fn(async () => ({})),
}));
vi.mock('@/services/appointments/benchSlots', () => ({ blockSlotForWalkIn: vi.fn(async () => null) }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: mocks.findUser }) })) } }));
vi.mock('./controller', () => ({ default: { createRepair: mocks.createRepair, getRepairs: vi.fn(), getRepairById: vi.fn(), updateRepairById: vi.fn() } }));
vi.mock('@/lib/apiAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRepairsAccess: mocks.requireRepairsAccess };
});

const { POST } = await import('./route.js');
const { REPAIR_STATUS } = await import('@/services/repairWorkflow');

const jsonReq = (body) => ({
  headers: { get: () => 'application/json' },
  json: async () => body,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createRepair.mockImplementation(async (data) => ({ repairID: 'r-new', ...data }));
});

describe('POST /api/repairs as a wholesaler', () => {
  beforeEach(() => {
    mocks.requireRepairsAccess.mockResolvedValue({
      session: { user: { role: 'wholesaler', userID: 'ws-marlen', email: 'andrew@marlen.test' } },
      errorResponse: null,
    });
  });

  it('forces PENDING PICKUP even when the payload claims COMPLETED', async () => {
    await POST(jsonReq({ userID: 'cust-1', clientName: 'C', status: 'COMPLETED', isWholesale: true }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.status).toBe(REPAIR_STATUS.PENDING_PICKUP);
  });

  it("names the account by the store's BUSINESS, never the contact (the Sam Johnson bug)", async () => {
    await POST(jsonReq({ userID: 'cust-1', clientName: 'Sam Johnson', businessName: 'Sam Johnson', storeName: 'Sam Johnson' }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.businessName).toBe('Greers Pawn');
    expect(created.storeName).toBe('Greers Pawn');
    expect(created.storeId).toBe('ws-marlen'); // the wholesaler's own userID
    expect(mocks.findUser).toHaveBeenCalledWith({ userID: 'ws-marlen', role: 'wholesaler' }, expect.anything());
  });

  it('keeps the payload name when the store lookup fails (intake must not block)', async () => {
    mocks.findUser.mockRejectedValueOnce(new Error('mongo blip'));
    await POST(jsonReq({ userID: 'cust-1', clientName: 'C', businessName: 'Typed Name' }));
    expect(mocks.createRepair.mock.calls[0][0].businessName).toBe('Typed Name');
  });

  it('forces isWholesale even when the payload says false', async () => {
    await POST(jsonReq({ userID: 'cust-1', clientName: 'C', isWholesale: false }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.isWholesale).toBe(true);
    // createdBy is stamped from the session, never the payload — it is what
    // the ownership filter matches on.
    expect(created.createdBy).toBe('ws-marlen');
  });
});

describe('POST /api/repairs as admin', () => {
  it('keeps the posted status — staff intake is unchanged', async () => {
    mocks.requireRepairsAccess.mockResolvedValue({
      session: { user: { role: 'admin', userID: 'admin-1', email: 'a@efd.test' } },
      errorResponse: null,
    });
    await POST(jsonReq({ userID: 'cust-1', clientName: 'C', status: 'READY FOR WORK' }));
    expect(mocks.createRepair.mock.calls[0][0].status).toBe('READY FOR WORK');
  });
});
