import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The button that spends money by hand (owner, 2026-09-29: "add a 'Rerun payroll' button so I can run
 * payroll if those funds didn't land by 6 am on Wednesday").
 *
 * Two things matter here and nothing else: nobody but an admin can press it, and a manual run is
 * recorded exactly like the cron's — a payroll run that leaves no heartbeat is the invisibility this
 * card was built to end.
 */
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  runWeeklyPayroll: vi.fn(),
  withHeartbeat: vi.fn(async (job, run) => run()),
}));

vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/services/payroll/autoPayroll', () => ({ runWeeklyPayroll: mocks.runWeeklyPayroll }));
// The heartbeat's own recording is covered by cronHeartbeat.test.js; what this route owes is to run
// THROUGH it, under the same job name the cron uses, so both kinds of run land in one history.
vi.mock('@/services/payroll/cronHeartbeat', () => ({ withHeartbeat: mocks.withHeartbeat }));

const { POST } = await import('./route');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withHeartbeat.mockImplementation(async (job, run) => run());
  mocks.requireRole.mockResolvedValue({ session: { user: { role: 'admin', email: 'jacob@efd.test', userID: 'u1' } }, errorResponse: null });
  mocks.runWeeklyPayroll.mockResolvedValue({
    finalized: [{ batchID: 'rpay-1', amount: 295 }],
    errors: [],
    payouts: { paid: [{ batchID: 'rpay-1', amount: 295 }], shortfall: [] },
  });
});

describe('POST /api/repairs/payroll/run', () => {
  it('runs the same job the Wednesday cron runs, stamped by whoever pressed it', async () => {
    const res = await POST();
    const body = await res.json();

    expect(mocks.runWeeklyPayroll).toHaveBeenCalledWith({ createdBy: 'jacob@efd.test' });
    expect(body).toMatchObject({ ok: true, ranBy: 'jacob@efd.test' });
    expect(body.payouts.paid).toHaveLength(1);
  });

  it('records the manual run on the heartbeat, so the card shows it like a scheduled one', async () => {
    await POST();
    expect(mocks.withHeartbeat).toHaveBeenCalledWith('weekly-payroll', expect.any(Function));
  });

  it('reports not-ok when the run came back with errors, rather than a bare 200', async () => {
    mocks.runWeeklyPayroll.mockResolvedValue({ finalized: [], errors: [{ error: 'no Stripe account' }], payouts: null });
    const body = await (await POST()).json();
    expect(body.ok).toBe(false);
    expect(body.errors).toHaveLength(1);
  });

  it('is admin-only — it moves money', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: new Response('nope', { status: 403 }) });
    const res = await POST();
    expect(res.status).toBe(403);
    expect(mocks.runWeeklyPayroll).not.toHaveBeenCalled();
  });

  it('surfaces a thrown failure as a 500 instead of a silent success', async () => {
    mocks.runWeeklyPayroll.mockRejectedValue(new Error('mongo down'));
    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('mongo down');
  });
});
