import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Hourly time tracking. The property that matters most: a finished shift becomes a LABOR LOG, because
 * that is what payroll batches and Stripe pays — a timesheet nobody can be paid from would be a form,
 * not a feature.
 */
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  insertOne: vi.fn(async () => ({})),
  updateOne: vi.fn(async () => ({})),
  createLog: vi.fn(async (d) => ({ ...d, logID: 'log-1' })),
  rateFor: vi.fn(async () => 15),
  onTheClock: vi.fn(async () => ({ userID: 'u-apprentice' })),
}));

vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: mocks.findOne, insertOne: mocks.insertOne, updateOne: mocks.updateOne, find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }) }) },
}));
vi.mock('@/app/api/repairLaborLogs/model', () => ({ default: { create: mocks.createLog } }));
vi.mock('@/app/api/repairLaborLogs/utils', () => ({ getLaborRateSnapshotForUser: mocks.rateFor }));
vi.mock('@/services/pay/apprentice', () => ({ assertOnTheClock: mocks.onTheClock }));

const { shiftHours, shiftValue, summarizeShifts, clockIn, clockOut, addManualShift } = await import('./timeClock');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOne.mockResolvedValue(null);
  mocks.rateFor.mockResolvedValue(15);
  mocks.onTheClock.mockResolvedValue({ userID: 'u-apprentice' });
});

/**
 * Only people paid by the hour may clock (owner, 2026-09-30). This used to take anyone signed in and
 * credit the shift at their resolved rate — the $50 shop rate for anyone never placed on the ladder —
 * and the first shift ever entered did go in at $50/hr by mistake.
 */
describe('who may use the clock', () => {
  const refuse = () => {
    const e = new Error('The time clock is for apprentices paid by the hour.');
    e.code = 'NOT_ON_THE_CLOCK';
    return e;
  };

  it('refuses to open a shift for someone not paid by the hour', async () => {
    mocks.onTheClock.mockRejectedValue(refuse());
    await expect(clockIn({ userID: 'u-bench-jeweler' })).rejects.toMatchObject({ code: 'NOT_ON_THE_CLOCK' });
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });

  it('refuses hand-entered hours for them too — that would pay a task-paid jeweler twice', async () => {
    mocks.onTheClock.mockRejectedValue(refuse());
    await expect(addManualShift({ userID: 'u-bench-jeweler', hours: 6 })).rejects.toMatchObject({ code: 'NOT_ON_THE_CLOCK' });
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.createLog).not.toHaveBeenCalled();
  });

  it('checks before anything else, so a refusal leaves no half-written shift', async () => {
    mocks.onTheClock.mockRejectedValue(refuse());
    await clockIn({ userID: 'u-x' }).catch(() => {});
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
});

describe('the arithmetic (pure)', () => {
  it('measures a shift to the hundredth of an hour and never backwards', () => {
    expect(shiftHours('2026-09-29T09:00:00Z', '2026-09-29T12:30:00Z')).toBe(3.5);
    expect(shiftHours('2026-09-29T09:00:00Z', '2026-09-29T09:20:00Z')).toBe(0.33);
    expect(shiftHours('2026-09-29T12:00:00Z', '2026-09-29T09:00:00Z')).toBe(0);
    expect(shiftHours(null, undefined)).toBe(0);
  });

  it('values it at the rate given, to the cent', () => {
    expect(shiftValue(3.5, 15)).toBe(52.5);
    expect(shiftValue(0.33, 15)).toBe(4.95);
    expect(shiftValue(5, 0)).toBe(0);
  });

  it('totals a timesheet', () => {
    expect(summarizeShifts([{ hours: 3.5, value: 52.5, endedAt: 'x' }, { hours: 2, value: 30, endedAt: 'x' }, { hours: 0, endedAt: null }]))
      .toEqual({ count: 2, hours: 5.5, value: 82.5 });
  });
});

describe('clocking in', () => {
  it('opens a shift', async () => {
    const r = await clockIn({ userID: 'u-apprentice', userName: 'Apprentice' });
    expect(r.started).toBe(true);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ userID: 'u-apprentice', endedAt: null, source: 'clock' }));
  });

  it('will not open a second one — two open shifts would pay the same hour twice', async () => {
    mocks.findOne.mockResolvedValue({ shiftID: 'shift-1', userID: 'u-apprentice', endedAt: null });
    const r = await clockIn({ userID: 'u-apprentice' });
    expect(r).toMatchObject({ started: false, reason: 'already clocked in' });
    expect(mocks.insertOne).not.toHaveBeenCalled();
  });
});

describe('clocking out', () => {
  const openShift = { shiftID: 'shift-1', userID: 'u-apprentice', userName: 'Apprentice', startedAt: new Date('2026-09-29T09:00:00Z'), endedAt: null, note: '' };

  it('credits the shift as a payable labor log at the person’s own rate', async () => {
    mocks.findOne.mockResolvedValue(openShift);
    const r = await clockOut({ userID: 'u-apprentice', endedAt: new Date('2026-09-29T13:00:00Z') });

    expect(r).toMatchObject({ ended: true, credited: true, needsRate: false });
    expect(mocks.createLog).toHaveBeenCalledWith(expect.objectContaining({
      primaryJewelerUserID: 'u-apprentice',
      creditedLaborHours: 4,
      laborRateSnapshot: 15,
      creditedValue: 60,
      sourceAction: 'hourly_shift',
      // An hour on the clock is payable on sight — there is no QC gate on time.
      pendingQc: false,
      requiresAdminReview: false,
    }));
    // …and the timesheet row keeps the snapshot, so a later rate change cannot rewrite it.
    expect(mocks.updateOne).toHaveBeenCalledWith({ shiftID: 'shift-1' }, { $set: expect.objectContaining({ hours: 4, rate: 15, value: 60, logID: 'log-1' }) });
  });

  it('flags a shift worked with no rate on file instead of paying zero quietly', async () => {
    mocks.findOne.mockResolvedValue(openShift);
    mocks.rateFor.mockResolvedValue(0);
    const r = await clockOut({ userID: 'u-apprentice', endedAt: new Date('2026-09-29T13:00:00Z') });

    expect(r.needsRate).toBe(true);
    expect(mocks.createLog).toHaveBeenCalledWith(expect.objectContaining({
      creditedValue: 0, requiresAdminReview: true, notes: expect.stringContaining('No hourly rate'),
    }));
  });

  it('says so when nobody is clocked in, and refuses a shift shorter than a minute', async () => {
    expect(await clockOut({ userID: 'u-apprentice' })).toMatchObject({ ended: false, reason: 'not clocked in' });
    mocks.findOne.mockResolvedValue({ ...openShift, startedAt: new Date('2026-09-29T09:00:00Z') });
    await expect(clockOut({ userID: 'u-apprentice', endedAt: new Date('2026-09-29T09:00:00Z') })).rejects.toThrow(/shorter than a minute/);
  });
});

describe('hours added by hand', () => {
  it('pays exactly what a clocked hour pays', async () => {
    const r = await addManualShift({ userID: 'u-apprentice', userName: 'Apprentice', hours: 5.5, note: 'started before we set this up', enteredBy: 'jacob' });

    expect(r.credited).toBe(true);
    expect(mocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({ source: 'manual', enteredBy: 'jacob' }));
    expect(mocks.createLog).toHaveBeenCalledWith(expect.objectContaining({
      creditedLaborHours: 5.5, laborRateSnapshot: 15, creditedValue: 82.5, sourceAction: 'hourly_shift',
    }));
  });

  it('accepts a start and end instead of a number of hours', async () => {
    await addManualShift({ userID: 'u-apprentice', startedAt: '2026-09-29T08:00:00Z', endedAt: '2026-09-29T11:15:00Z' });
    expect(mocks.createLog).toHaveBeenCalledWith(expect.objectContaining({ creditedLaborHours: 3.25, creditedValue: 48.75 }));
  });

  it('refuses an entry with nothing to measure', async () => {
    await expect(addManualShift({ userID: 'u-apprentice' })).rejects.toThrow(/start and end time, or a number of hours/);
    await expect(addManualShift({ userID: '' })).rejects.toThrow(/user is required/);
  });
});
