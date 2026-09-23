import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ updateOne: vi.fn(async () => ({})), find: vi.fn() }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ updateOne: mocks.updateOne, find: mocks.find }) }) },
}));

const { summarizeWeeklyRun, summarizeJobRun, nextRunAt, isOverdue, recordCronRun, readPayrollRuns } = await import('./cronHeartbeat');

const WED = new Date('2026-09-23T11:00:44Z'); // the real run this was built for

beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockReturnValue({ project: () => ({ toArray: async () => [] }) });
});

describe('summaries (pure)', () => {
  it('says "nothing to pay" out loud — the whole point is that silence was indistinguishable from a missed run', () => {
    expect(summarizeWeeklyRun({ finalized: [], errors: [], payouts: { paid: [], shortfall: [] } }))
      .toBe('Nothing to pay — no closed week had unpaid work');
    expect(summarizeWeeklyRun({})).toMatch(/Nothing to pay/);
  });

  it('reports what was paid, what was short and what failed', () => {
    expect(summarizeWeeklyRun({ finalized: [{}, {}], payouts: { paid: [{ amount: 595 }, { amount: 75 }], shortfall: [] } }))
      .toBe('paid 2 batches, $670.00');
    expect(summarizeWeeklyRun({ finalized: [{}], payouts: { paid: [], shortfall: [{ amount: 75 }], shortfallTotal: 75 } }))
      .toBe('finalized 1 batch · $75.00 could not be sent — Stripe balance short');
    expect(summarizeWeeklyRun({ errors: [{ error: 'boom' }] })).toMatch(/1 error/);
  });

  it('covers the other payroll jobs, including their skip reasons', () => {
    expect(summarizeJobRun('payroll-payouts', { paid: [{ amount: 50 }] })).toBe('Paid 1, $50.00');
    expect(summarizeJobRun('payroll-payouts', { paid: [], shortfall: [] })).toBe('Nothing due today');
    expect(summarizeJobRun('payroll-funding', { skipped: 'funding check is off in Store Settings' })).toMatch(/off in Store Settings/);
    expect(summarizeJobRun('payroll-funding', { topup: { amount: 300 } })).toBe('Pulled $300.00 into Stripe');
    expect(summarizeJobRun('payroll-sweep', { payout: { amount: 760 } })).toBe('Swept $760.00 to the bank');
    expect(summarizeJobRun('weekly-payroll', { error: 'db down' })).toBe('Failed: db down');
  });
});

describe('schedule maths (pure)', () => {
  it('the weekly run is next Wednesday 11:00 UTC; today counts only if its slot has not gone', () => {
    expect(nextRunAt('weekly-payroll', new Date('2026-09-23T09:00:00Z')).toISOString()).toBe('2026-09-23T11:00:00.000Z');
    expect(nextRunAt('weekly-payroll', WED).toISOString()).toBe('2026-09-30T11:00:00.000Z');
    expect(nextRunAt('weekly-payroll', new Date('2026-09-26T23:00:00Z')).toISOString()).toBe('2026-09-30T11:00:00.000Z');
  });

  it('daily jobs roll to tomorrow once their slot has gone', () => {
    expect(nextRunAt('payroll-payouts', new Date('2026-09-23T13:00:00Z')).toISOString()).toBe('2026-09-24T12:00:00.000Z');
    expect(nextRunAt('payroll-payouts', new Date('2026-09-23T09:00:00Z')).toISOString()).toBe('2026-09-23T12:00:00.000Z');
  });

  it('overdue means a missed slot plus grace — and never having run at all counts', () => {
    expect(isOverdue('weekly-payroll', null, WED)).toBe(true);
    expect(isOverdue('weekly-payroll', WED, new Date('2026-09-30T11:30:00Z'))).toBe(false); // on time
    expect(isOverdue('weekly-payroll', WED, new Date('2026-10-01T18:00:00Z'))).toBe(true);  // a week and a day late
    expect(isOverdue('payroll-payouts', new Date('2026-09-23T12:00:00Z'), new Date('2026-09-24T13:00:00Z'))).toBe(false);
    expect(isOverdue('payroll-payouts', new Date('2026-09-21T12:00:00Z'), new Date('2026-09-23T18:00:00Z'))).toBe(true);
  });
});

describe('recording', () => {
  it('stamps the run, keeps a capped history and marks failure', async () => {
    await recordCronRun({ job: 'weekly-payroll', result: { finalized: [], payouts: { paid: [] } }, ranAt: WED, durationMs: 1200 });
    const [query, update, opts] = mocks.updateOne.mock.calls[0];
    expect(query).toEqual({ job: 'weekly-payroll' });
    expect(opts).toEqual({ upsert: true });
    expect(update.$set.last).toMatchObject({ ranAt: WED, ok: true, summary: 'Nothing to pay — no closed week had unpaid work', durationMs: 1200 });
    expect(update.$push.history.$slice).toBe(-20);

    await recordCronRun({ job: 'weekly-payroll', ok: false, error: 'stripe down', ranAt: WED });
    expect(mocks.updateOne.mock.calls[1][1].$set.last).toMatchObject({ ok: false, error: 'stripe down', summary: 'Failed: stripe down' });
  });

  it('a heartbeat that cannot be written never breaks the run', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('mongo gone'));
    await expect(recordCronRun({ job: 'weekly-payroll', result: {} })).resolves.toEqual({ recorded: false });
  });
});

describe('readPayrollRuns', () => {
  it('reports every payroll job, flagging the ones that have never run', async () => {
    const rows = await readPayrollRuns({ now: WED });
    expect(rows.map((r) => r.job)).toEqual(['weekly-payroll', 'payroll-payouts', 'payroll-funding', 'payroll-sweep']);
    const weekly = rows[0];
    expect(weekly).toMatchObject({ label: 'Weekly payroll', neverRun: true, overdue: true, lastRanAt: null });
    expect(weekly.nextRunAt.toISOString()).toBe('2026-09-30T11:00:00.000Z');
  });

  it('reports a recorded run as healthy', async () => {
    mocks.find.mockReturnValue({ project: () => ({ toArray: async () => [
      { job: 'weekly-payroll', last: { ranAt: WED, ok: true, summary: 'Nothing to pay — no closed week had unpaid work' } },
    ] }) });
    const weekly = (await readPayrollRuns({ now: new Date('2026-09-23T18:00:00Z') }))[0];
    expect(weekly).toMatchObject({ neverRun: false, overdue: false, ok: true });
    expect(weekly.summary).toMatch(/Nothing to pay/);
  });
});
