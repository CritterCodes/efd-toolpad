import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The contract the payroll health card renders. What matters here is the number the owner acts on:
 * how much has to be IN Stripe before the next run, given that a Connect transfer can only spend
 * balance that is already there.
 */
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(async () => ({ session: { user: { role: 'admin', userID: 'u1' } }, errorResponse: null })),
  readPayrollRuns: vi.fn(),
  projectPayrollDue: vi.fn(),
  readFundingSettings: vi.fn(),
  retrieveBalance: vi.fn(),
  isStripeConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/services/payroll/cronHeartbeat', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, readPayrollRuns: mocks.readPayrollRuns };
});
vi.mock('@/services/payroll/payrollFunding', () => ({
  projectPayrollDue: mocks.projectPayrollDue,
  readFundingSettings: mocks.readFundingSettings,
}));
vi.mock('@/lib/stripeConnect', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, isStripeConfigured: mocks.isStripeConfigured, retrieveBalance: mocks.retrieveBalance };
});

const { GET } = await import('./route');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { user: { role: 'admin', userID: 'u1' } }, errorResponse: null });
  mocks.isStripeConfigured.mockReturnValue(true);
  mocks.readPayrollRuns.mockResolvedValue([{ job: 'weekly-payroll', label: 'Weekly payroll', lastRanAt: new Date('2026-09-23T11:00:44Z'), ok: true, summary: 'Nothing to pay — no closed week had unpaid work', overdue: false, neverRun: false }]);
  mocks.projectPayrollDue.mockResolvedValue({ projected: 75, finalizedTotal: 0, unbatchedTotal: 75, payees: ['jacob engel'] });
  mocks.readFundingSettings.mockResolvedValue({ enabled: false, floor: 300 });
  mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 0 }], pending: [] });
});

const body = async () => (await GET()).json();

describe('GET /api/repairs/payroll/status', () => {
  it('says what is owed, what Stripe holds, and the gap the owner has to close', async () => {
    const d = await body();
    expect(d.due).toMatchObject({ projected: 75, payees: ['jacob engel'] });
    expect(d.balance).toEqual({ available: 0, pending: 0 });
    expect(d.shortfall).toBe(75);
    expect(d.funding).toEqual({ enabled: false, floor: 300 });
    expect(d.runs[0].summary).toMatch(/Nothing to pay/);
  });

  it('counts money still settling — it lands well before Wednesday', async () => {
    mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 2000 }], pending: [{ currency: 'usd', amount: 4000 }] });
    const d = await body();
    expect(d.balance).toEqual({ available: 20, pending: 40 });
    expect(d.shortfall).toBe(15); // 75 due against 60 arriving
  });

  it('a covered balance reports no shortfall rather than a negative one', async () => {
    mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 50000 }], pending: [] });
    expect((await body()).shortfall).toBe(0);
  });

  it('an unreachable Stripe still reports what is owed, flagged, instead of blanking the card', async () => {
    mocks.retrieveBalance.mockRejectedValue(new Error('stripe down'));
    const d = await body();
    expect(d.due.projected).toBe(75);
    expect(d.balance.error).toBe('stripe down');
    expect(d.shortfall).toBeNull();
  });

  it('survives a projection failure and an unconfigured Stripe', async () => {
    mocks.projectPayrollDue.mockRejectedValue(new Error('mongo gone'));
    mocks.isStripeConfigured.mockReturnValue(false);
    const d = await body();
    expect(d.due).toMatchObject({ projected: 0, error: 'mongo gone' });
    expect(d.balance).toBeNull();
    expect(d.stripe).toBe(false);
  });

  it('is admin-only', async () => {
    const denied = { status: 403 };
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: denied });
    expect(await GET()).toBe(denied);
    expect(mocks.projectPayrollDue).not.toHaveBeenCalled();
  });
});
