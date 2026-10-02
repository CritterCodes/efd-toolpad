import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPayrollWeekStart, getWeekEndFromStart } from '@/services/payrollUtils';

/**
 * EFD-DEFECTS P4 — a credit that could never be batched.
 *
 * `listPayrollCandidates` groups by the `weekStart` STORED on the log; `createPayrollBatch` re-normalizes
 * whatever it is handed to that week's Sunday and asks `payrollCandidateBreakdown` for the detail. While
 * the breakdown matched that Sunday exactly, any log stored on a different instant of the same week —
 * every log written before the shop moved from Monday weeks to Sunday weeks on 2026-09-22 — showed in the
 * queue as money owed and threw "No eligible labor logs" on every attempt to pay it.
 *
 * These pin the match the breakdown builds. Nothing in production is affected today (read-only check,
 * 2026-10-02: zero unbatched candidates in either database), which is exactly why it needs a test — the
 * next week-boundary change is the one that strands money again.
 */
const aggregate = vi.fn(() => ({ toArray: async () => [] }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ aggregate: (...a) => aggregate(...a) }) }) },
}));

const { payrollCandidateBreakdown } = await import('./payroll');

/** The `$match` the breakdown actually sent to Mongo. */
const matchFor = async (weekStart) => {
  aggregate.mockClear();
  await payrollCandidateBreakdown({ weekStart, userID: 'u-1' });
  return aggregate.mock.calls[0][0][0].$match;
};

// A Sunday, the week start the shop uses today.
const SUNDAY = getPayrollWeekStart(new Date('2026-09-27T12:00:00'));

describe('the payroll week a breakdown asks for', () => {
  beforeEach(() => { aggregate.mockClear(); });

  it('covers the whole week, not one instant', async () => {
    const match = await matchFor(SUNDAY);
    expect(match.weekStart.$gte).toEqual(SUNDAY);
    expect(match.weekStart.$lte).toEqual(getWeekEndFromStart(SUNDAY));
    expect(match.weekStart.$lte.getTime()).toBeGreaterThan(match.weekStart.$gte.getTime());
  });

  it('includes a log stored on the Monday of that week — the credits P4 stranded', async () => {
    const match = await matchFor(SUNDAY);
    const monday = new Date(SUNDAY);
    monday.setDate(monday.getDate() + 1);

    expect(monday.getTime()).toBeGreaterThanOrEqual(match.weekStart.$gte.getTime());
    expect(monday.getTime()).toBeLessThanOrEqual(match.weekStart.$lte.getTime());
  });

  it('stops at the end of the week — the next week is a different batch', async () => {
    const match = await matchFor(SUNDAY);
    const nextSunday = new Date(SUNDAY);
    nextSunday.setDate(nextSunday.getDate() + 7);

    expect(nextSunday.getTime()).toBeGreaterThan(match.weekStart.$lte.getTime());
  });

  it('still only asks for that artisan, and only for payable credit', async () => {
    // Widening the week must not widen anything else: held, reviewed or already-batched credit stays out.
    const match = await matchFor(SUNDAY);
    expect(match.primaryJewelerUserID).toBe('u-1');
    expect(match.requiresAdminReview).toBe(false);
    expect(match.pendingQc).toEqual({ $ne: true });
    expect(match.$or).toEqual([
      { payrollStatus: { $exists: false } },
      { payrollStatus: 'unbatched' },
      { payrollStatus: '' },
    ]);
  });

  it('refuses to build one without both a week and an artisan', async () => {
    await expect(payrollCandidateBreakdown({ userID: 'u-1' })).rejects.toThrow(/weekStart and userID/);
    await expect(payrollCandidateBreakdown({ weekStart: SUNDAY })).rejects.toThrow(/weekStart and userID/);
  });
});
