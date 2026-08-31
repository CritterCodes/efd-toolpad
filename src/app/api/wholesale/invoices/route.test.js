import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A wholesaler's billing view. What must hold:
 *   1. scoped to THEIR invoices — by userID and by business key (admin-created
 *      wholesale repairs carry the business identity, not the wholesaler's id)
 *   2. drafts and voids never appear (not issued / not owed)
 *   3. the open balance sums only open, unpaid invoices
 *   4. closeout notes and other internals stay home (projection)
 */

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), find: vi.fn(), userFindOne: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/apiAuth', () => ({
  requireRole: mocks.requireRole,
  isStaffRepairSession: (session) => ['admin', 'dev'].includes(session?.user?.role),
}));
vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => (name === 'users'
        ? { findOne: mocks.userFindOne }
        : { find: mocks.find }),
    })),
  },
}));
// The real normalizer, so the business-key join is tested against the actual rule.
vi.mock('@/app/api/repair-invoices/service', async (importOriginal) => {
  const actual = await importOriginal();
  return { normalizeAccountKey: actual.normalizeAccountKey };
});

const { GET } = await import('./route.js');

const invoice = (over = {}) => ({
  invoiceID: 'rinv-1', createdAt: new Date('2026-08-01'), status: 'open', paymentStatus: 'unpaid',
  total: 100, amountPaid: 0, remainingBalance: 100, repairIDs: ['r1'],
  ...over,
});

const chain = (rows) => ({ sort: () => ({ limit: () => ({ toArray: async () => rows }) }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({
    session: { user: { role: 'wholesaler', userID: 'ws-marlen' } },
    errorResponse: null,
  });
  mocks.userFindOne.mockResolvedValue({ business: 'Marlen Jewelers', wholesaleApplication: { businessName: 'Marlen Jewelers' } });
  mocks.find.mockImplementation(() => chain([invoice()]));
});

describe('GET /api/wholesale/invoices', () => {
  it('scopes to the wholesaler by userID AND their business key', async () => {
    await GET();
    const filter = mocks.find.mock.calls[0][0];
    expect(filter.accountType).toBe('wholesale');
    expect(filter.$or).toEqual([
      { clientID: 'ws-marlen' },
      { storeId: 'ws-marlen' },
      { accountID: { $in: ['wholesale-business:marlen-jewelers'] } },
    ]);
  });

  it('never surfaces drafts or voids — not issued and not owed', async () => {
    await GET();
    expect(mocks.find.mock.calls[0][0].status).toEqual({ $in: ['open', 'paid'] });
  });

  it('open balance sums only open unpaid invoices', async () => {
    mocks.find.mockImplementation(() => chain([
      invoice({ invoiceID: 'a', remainingBalance: 60 }),
      invoice({ invoiceID: 'b', status: 'paid', paymentStatus: 'paid', remainingBalance: 0, amountPaid: 100 }),
      invoice({ invoiceID: 'c', remainingBalance: 40.005 }), // rounding stays honest
    ]));
    const res = await GET();
    expect(res._data.openBalance).toBe(100.01);
  });

  it('projects internals away — closeout notes never cross', async () => {
    await GET();
    const projection = mocks.find.mock.calls[0][1].projection;
    expect(projection.closeoutNotes).toBeUndefined();      // not selected
    expect(projection.createdBy).toBeUndefined();
    expect(projection.stripeClientSecret).toBeUndefined();
    // inclusion-style projection: only listed fields cross
    expect(Object.values(projection).every((v) => v === 0 || v === 1)).toBe(true);
    expect(projection.invoiceID).toBe(1);
  });

  it('staff sessions see all wholesale invoices (their own admin views reuse this)', async () => {
    mocks.requireRole.mockResolvedValue({ session: { user: { role: 'admin', userID: 'a1' } }, errorResponse: null });
    await GET();
    expect(mocks.find.mock.calls[0][0].$or).toBeUndefined();
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('honors the role gate', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 403 } });
    const res = await GET();
    expect(res._status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
