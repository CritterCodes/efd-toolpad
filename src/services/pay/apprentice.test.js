import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * What an apprentice is, to the code (owner, 2026-09-30):
 *   1. paid by the hour on the time clock, as a shop expense
 *   2. never the holder of a job — so no bench credit ever lands on them
 *
 * Both shop apprentices were invisible to every line that pays anyone: the artisan page offered
 * "Staff type: Apprentice" and "Pay type: Hourly", and nothing read either. One was credited at the
 * $50 shop rate with QC authority. What must hold now:
 *   - the Apprentice pay-tier rung IS the flag, read from the stored record, not the live ladder
 *   - an apprentice can't claim, be assigned, or be handed a job
 *   - only an apprentice can use the clock
 *   - bench credit that reaches an apprentice by ANY path is held for review, never paid
 */
const mocks = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: mocks.findOne }) }) },
}));

const {
  APPRENTICE_TIER, APPRENTICE_ERROR, NOT_APPRENTICE_QUERY,
  isApprentice, canUseTimeClock, assertCanHoldWork, assertOnTheClock, isOnTheClock,
  apprenticeErrorStatus, apprenticeCreditHold,
} = await import('./apprentice');

const henlie = { userID: 'u-henlie', firstName: 'Henlie', lastName: 'Nall', employment: { payTier: 'apprentice', hourlyRate: 15 } };
const jacob = { userID: 'u-jacob', firstName: 'Jacob', lastName: 'Engel', employment: { isOnsite: true, hourlyRate: 50 } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOne.mockResolvedValue(null);
});

describe('who is an apprentice (pure)', () => {
  it('is whoever sits on the Apprentice rung', () => {
    expect(APPRENTICE_TIER).toBe('apprentice');
    expect(isApprentice(henlie)).toBe(true);
    expect(isApprentice({ employment: { payTier: ' apprentice ' } })).toBe(true);
  });

  it('is nobody else — including the decorative fields that never did anything', () => {
    expect(isApprentice(jacob)).toBe(false);
    expect(isApprentice({ employment: { payTier: 'bench-jeweler' } })).toBe(false);
    expect(isApprentice({ employment: { staffType: 'apprentice', payType: 'hourly' } })).toBe(false);
    expect(isApprentice({})).toBe(false);
    expect(isApprentice(null)).toBe(false);
  });

  it('gives the clock only to apprentices', () => {
    expect(canUseTimeClock(henlie)).toBe(true);
    expect(canUseTimeClock(jacob)).toBe(false);
  });

  it('keeps apprentices out of every assignable-jeweler query', () => {
    expect(NOT_APPRENTICE_QUERY).toEqual({ 'employment.payTier': { $ne: 'apprentice' } });
  });
});

describe('holding a job', () => {
  it('lets a jeweler hold one', async () => {
    mocks.findOne.mockResolvedValue(jacob);
    await expect(assertCanHoldWork('u-jacob')).resolves.toBeUndefined();
  });

  it('lets an unknown user through — the route\'s own checks decide those', async () => {
    await expect(assertCanHoldWork('u-nobody')).resolves.toBeUndefined();
    await expect(assertCanHoldWork('')).resolves.toBeUndefined();
  });

  it('refuses an apprentice claiming, and tells them why', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    const e = await assertCanHoldWork('u-henlie').catch((x) => x);
    expect(e.code).toBe(APPRENTICE_ERROR.HOLD);
    expect(e.message).toMatch(/you’re paid on the time clock/);
    expect(apprenticeErrorStatus(e)).toBe(403);
  });

  it('refuses giving one TO an apprentice, and names them', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    const e = await assertCanHoldWork('u-henlie', { who: 'other' }).catch((x) => x);
    expect(e.code).toBe(APPRENTICE_ERROR.HOLD);
    expect(e.message).toMatch(/^Henlie Nall is an apprentice/);
  });

  it('reads the database, never the session — a session still says "jeweler" an hour after placement', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    await assertCanHoldWork('u-henlie').catch(() => {});
    expect(mocks.findOne).toHaveBeenCalledWith({ userID: 'u-henlie' }, expect.anything());
  });
});

describe('the time clock', () => {
  it('admits an apprentice', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    await expect(assertOnTheClock('u-henlie')).resolves.toMatchObject({ userID: 'u-henlie' });
    await expect(isOnTheClock('u-henlie')).resolves.toBe(true);
  });

  it('refuses everyone else — a customer account used to be able to clock itself onto payroll', async () => {
    mocks.findOne.mockResolvedValue(jacob);
    const e = await assertOnTheClock('u-jacob').catch((x) => x);
    expect(e.code).toBe(APPRENTICE_ERROR.CLOCK);
    expect(apprenticeErrorStatus(e)).toBe(403);
    await expect(isOnTheClock('u-jacob')).resolves.toBe(false);
  });

  it('answers "no" rather than throwing when the lookup fails', async () => {
    mocks.findOne.mockRejectedValue(new Error('mongo gone'));
    await expect(isOnTheClock('u-henlie')).resolves.toBe(false);
  });
});

describe('the labor-log backstop', () => {
  it('holds bench credit that lands on an apprentice for review', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    const hold = await apprenticeCreditHold({ userID: 'u-henlie', sourceType: 'repair' });
    expect(hold).toMatchObject({ requiresAdminReview: true, apprenticeHold: true });
    expect(hold.holdNote).toMatch(/reassign/i);
  });

  it('catches every non-shift source, not just repairs', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    for (const sourceType of ['repair', 'production_piece', 'custom', 'cad', null, undefined]) {
      expect(await apprenticeCreditHold({ userID: 'u-henlie', sourceType })).not.toBeNull();
    }
  });

  it('never holds a SHIFT — that is their paycheck', async () => {
    mocks.findOne.mockResolvedValue(henlie);
    expect(await apprenticeCreditHold({ userID: 'u-henlie', sourceType: 'shift' })).toBeNull();
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('leaves a jeweler\'s credit alone', async () => {
    mocks.findOne.mockResolvedValue(jacob);
    expect(await apprenticeCreditHold({ userID: 'u-jacob', sourceType: 'repair' })).toBeNull();
  });

  it('fails open — a read hiccup must not stop paying people', async () => {
    mocks.findOne.mockRejectedValue(new Error('mongo gone'));
    expect(await apprenticeCreditHold({ userID: 'u-henlie', sourceType: 'repair' })).toBeNull();
  });
});

describe('error mapping', () => {
  it('maps only the apprentice codes', () => {
    expect(apprenticeErrorStatus({ code: 'APPRENTICE_CANNOT_HOLD_WORK' })).toBe(403);
    expect(apprenticeErrorStatus({ code: 'NOT_ON_THE_CLOCK' })).toBe(403);
    expect(apprenticeErrorStatus({ code: 'BAD_REQUEST' })).toBeNull();
    expect(apprenticeErrorStatus(null)).toBeNull();
  });
});
