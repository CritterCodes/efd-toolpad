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
  // The engine's answer for the ticket (services/pricing/repairPricing.js) — stubbed; its own tests price.
  priceRepairForSave: vi.fn(async () => ({})),
  recordIntakeOutcomes: vi.fn(async () => 1),
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
vi.mock('@/services/pricing/repairPricing', () => ({
  priceRepairForSave: mocks.priceRepairForSave,
  pricingErrorResponseInit: (e) => (e?.code === 'SETTINGS_INCOMPLETE' ? 503 : 400),
  PRICING_INPUT_FIELDS: ['tasks', 'materials'],
}));
vi.mock('./controller', () => ({ default: { createRepair: mocks.createRepair, getRepairs: vi.fn(), getRepairById: vi.fn(), updateRepairById: vi.fn() } }));
vi.mock('@/lib/apiAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRepairsAccess: mocks.requireRepairsAccess };
});

vi.mock('@/services/ai/smartIntakeLog', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, recordIntakeOutcomes: mocks.recordIntakeOutcomes };
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
  mocks.priceRepairForSave.mockImplementation(async () => ({}));
});

describe('POST /api/repairs prices on the SERVER (EFD-DEFECTS P12)', () => {
  beforeEach(() => {
    mocks.requireRepairsAccess.mockResolvedValue({
      session: { user: { role: 'wholesaler', userID: 'ws-marlen', email: 'andrew@marlen.test' } },
      errorResponse: null,
    });
  });

  it("stores the engine's prices, never the payload's", async () => {
    mocks.priceRepairForSave.mockResolvedValue({ tasks: [{ id: 1, price: 23.39 }], totalCost: 23.39, subtotal: 23.39 });
    await POST(jsonReq({ clientName: 'A', userID: 'c1', description: 'x', metalType: 'gold', karat: '14k', goldColor: 'yellow',
      tasks: [{ id: 1, price: 0.01 }], totalCost: 0.01, subtotal: 0.01 }));
    const [arg] = mocks.priceRepairForSave.mock.calls[0];
    expect(arg).toMatchObject({ metalType: 'gold', karat: '14k', goldColor: 'yellow' }); // the form's metal, not the folded one
    expect(mocks.createRepair.mock.calls[0][0]).toMatchObject({ tasks: [{ id: 1, price: 23.39 }], totalCost: 23.39, subtotal: 23.39 });
  });

  it('hands the smart-intake log ids to the log, never to the repair (Q13)', async () => {
    await POST(jsonReq({ clientName: 'A', userID: 'c1', description: 'x', metalType: 'gold', karat: '14k',
      smartIntakeLogIDs: ['sil-abc123', 'not-a-log-id'] }));
    expect(mocks.createRepair.mock.calls[0][0]).not.toHaveProperty('smartIntakeLogIDs');
    const [arg] = mocks.recordIntakeOutcomes.mock.calls[0];
    expect(arg.logIDs).toEqual(['sil-abc123']);
    expect(arg.repairID).toBe('r-new');
    expect(arg.body).toMatchObject({ metalType: 'gold', karat: '14k' }); // the form's metal, not the folded one
  });

  it("refuses a ticket the engine can't price, and saves nothing", async () => {
    const refusal = Object.assign(new Error('Size Down: Choose a metal to price this.'), { name: 'PricingError', code: 'UNPRICED' });
    mocks.priceRepairForSave.mockRejectedValue(refusal);
    const res = await POST(jsonReq({ clientName: 'A', userID: 'c1', description: 'x', tasks: [{ id: 1, price: 5 }] }));
    expect(res._status).toBe(400);
    expect(res._data.error).toMatch(/Choose a metal/);
    expect(mocks.createRepair).not.toHaveBeenCalled();
  });

  it('refuses with 503 when the pricing settings are missing', async () => {
    mocks.priceRepairForSave.mockRejectedValue(Object.assign(new Error('Pricing settings did not load.'), { name: 'PricingError', code: 'SETTINGS_INCOMPLETE' }));
    const res = await POST(jsonReq({ clientName: 'A', userID: 'c1', description: 'x', tasks: [] }));
    expect(res._status).toBe(503);
  });
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
  beforeEach(() => {
    mocks.requireRepairsAccess.mockResolvedValue({
      session: { user: { role: 'admin', userID: 'admin-1', email: 'a@efd.test' } },
      errorResponse: null,
    });
  });

  it('keeps the posted status — staff intake is unchanged', async () => {
    await POST(jsonReq({ userID: 'cust-1', clientName: 'C', status: 'READY FOR WORK' }));
    expect(mocks.createRepair.mock.calls[0][0].status).toBe('READY FOR WORK');
  });

  /**
   * A store drops off a tray with no customer names. Requiring a client made the shop enter the
   * store's OWNER as a client just to have something to type, which leaves a person in the system
   * who never brought anything in (owner, 2026-09-28).
   */
  it('keys a clientless wholesale ticket to the STORE instead of demanding a name', async () => {
    await POST(jsonReq({ storeId: 'ws-marlen', isWholesale: true, clientNotProvided: true, description: 'retip' }));
    const created = mocks.createRepair.mock.calls[0][0];

    expect(created.userID).toBe('ws-marlen');        // the controller refuses a repair with no userID
    expect(created.clientName).toBe('Greers Pawn');  // the print page refuses one with no client name
    expect(created.clientNotProvided).toBe(true);    // …and this says the customer is genuinely unknown
  });

  it('does it for a blank client too, not only when the button was pressed', async () => {
    await POST(jsonReq({ storeId: 'ws-marlen', isWholesale: true, clientName: '  ', userID: '' }));
    expect(mocks.createRepair.mock.calls[0][0].clientNotProvided).toBe(true);
  });

  it('leaves a named client alone, and never flags one', async () => {
    await POST(jsonReq({ storeId: 'ws-marlen', isWholesale: true, userID: 'cust-1', clientName: 'Dylan Caldwell', clientNotProvided: true }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.userID).toBe('cust-1');
    expect(created.clientName).toBe('Dylan Caldwell');
    expect(created.clientNotProvided).toBeUndefined();
  });

  it('does not apply to a retail ticket — a walk-in has a name', async () => {
    await POST(jsonReq({ isWholesale: false, clientName: '', userID: '' }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.clientName).toBe('');
    expect(created.clientNotProvided).toBeUndefined();
  });
});

describe('a wholesaler cannot skip naming their own client', () => {
  it('ignores clientNotProvided from a store — that name is how they find the job', async () => {
    mocks.requireRepairsAccess.mockResolvedValue({
      session: { user: { role: 'wholesaler', userID: 'ws-marlen', email: 'andrew@marlen.test' } },
      errorResponse: null,
    });
    await POST(jsonReq({ isWholesale: true, clientNotProvided: true, clientName: '', userID: '' }));
    const created = mocks.createRepair.mock.calls[0][0];
    expect(created.clientNotProvided).toBeUndefined();
    expect(created.clientName).toBe('');
    // …which leaves it for the controller to refuse for want of a userID, exactly as before.
    expect(created.userID).toBe('');
  });
});
