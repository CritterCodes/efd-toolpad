import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Paying a batch BY HAND, reopened 2026-09-29 at the owner's request.
 *
 * The 2026-09-22 rule — Stripe Connect or nothing — was written when every payee could hold a Stripe
 * account. An hourly apprentice handed cash on her first day is the case it did not anticipate. What
 * that rule was actually protecting against was SILENT settlement, so these tests pin the parts that
 * keep it from being silent: a recognised method is required, and the person who recorded it is
 * stamped from the session rather than taken from the payload.
 */
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  markPaid: vi.fn(async (batchID, opts) => ({ batchID, status: 'paid', ...opts })),
  finalize: vi.fn(),
  detail: vi.fn(async () => ({ batchID: 'rpay-1' })),
  voidBatch: vi.fn(),
  payViaConnect: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, status: init?.status ?? 200, json: async () => data })) },
}));
vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/services/payroll/connectPayouts', () => ({ payBatchViaConnect: mocks.payViaConnect }));
vi.mock('../service', () => ({
  finalizePayrollBatch: mocks.finalize,
  getPayrollBatchDetail: mocks.detail,
  markPayrollBatchPaid: mocks.markPaid,
  voidPayrollBatch: mocks.voidBatch,
}));

const { PATCH, MANUAL_PAYMENT_METHODS } = await import('./route');

const call = (body) => PATCH({ json: async () => body }, { params: { batchID: 'rpay-1' } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({
    session: { user: { role: 'admin', email: 'jacob@efd.test', userID: 'u-admin' } },
    errorResponse: null,
  });
});

describe('PATCH mark_paid', () => {
  it('records a cash payment, stamped with who recorded it', async () => {
    await call({ action: 'mark_paid', paymentMethod: 'cash', paymentReference: 'from the till' });

    expect(mocks.markPaid).toHaveBeenCalledWith('rpay-1', expect.objectContaining({
      paymentMethod: 'cash',
      paymentReference: 'from the till',
      paidBy: 'jacob@efd.test',
    }));
  });

  it('refuses a payment with no method — that is the silent settlement the rule was about', async () => {
    const res = await call({ action: 'mark_paid' });
    expect(res.status).toBe(400);
    expect(res._data.error).toMatch(/How was it paid/);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it('refuses a method it does not recognise rather than storing free text', async () => {
    const res = await call({ action: 'mark_paid', paymentMethod: 'vibes' });
    expect(res.status).toBe(400);
    expect(mocks.markPaid).not.toHaveBeenCalled();
    expect(MANUAL_PAYMENT_METHODS).toEqual(['cash', 'check', 'transfer', 'other']);
  });

  it('normalises the method, so "Cash" and "cash" are one thing in the books', async () => {
    await call({ action: 'mark_paid', paymentMethod: '  Cash  ' });
    expect(mocks.markPaid).toHaveBeenCalledWith('rpay-1', expect.objectContaining({ paymentMethod: 'cash' }));
  });

  it('never takes the payer from the payload', async () => {
    await call({ action: 'mark_paid', paymentMethod: 'check', paidBy: 'someone-else@example.com' });
    expect(mocks.markPaid).toHaveBeenCalledWith('rpay-1', expect.objectContaining({ paidBy: 'jacob@efd.test' }));
  });

  it('leaves the Stripe path alone', async () => {
    mocks.payViaConnect.mockResolvedValue({ paid: true });
    await call({ action: 'pay_stripe' });
    expect(mocks.payViaConnect).toHaveBeenCalled();
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });
});
