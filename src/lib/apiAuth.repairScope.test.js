import { describe, it, expect, vi } from 'vitest';

/**
 * The repair-ownership boundary. `requireRepairsAccess` admits wholesalers because
 * they create repairs — these helpers are what keeps that admission from meaning
 * "can read and edit every repair in the shop". A regression here IS the breach.
 */

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const { isStaffRepairSession, repairOwnershipFilter, canTouchRepair } = await import('@/lib/apiAuth');

const admin = { user: { role: 'admin', userID: 'admin-1' } };
const dev = { user: { role: 'dev', userID: 'dev-1' } };
// Must satisfy repairAccess.isOnsiteRepairOps: artisan + employment.isOnsite + repairOps.
const onsiteArtisan = { user: { role: 'artisan', userID: 'art-1', employment: { isOnsite: true }, staffCapabilities: { repairOps: true } } };
const wholesaler = { user: { role: 'wholesaler', userID: 'ws-marlen' } };
const otherWholesaler = { user: { role: 'wholesaler', userID: 'ws-other' } };

describe('isStaffRepairSession', () => {
  it('admits admin and dev', () => {
    expect(isStaffRepairSession(admin)).toBe(true);
    expect(isStaffRepairSession(dev)).toBe(true);
  });
  it('REFUSES a wholesaler — they are an outside business, not staff', () => {
    expect(isStaffRepairSession(wholesaler)).toBe(false);
  });
});

describe('repairOwnershipFilter', () => {
  it('staff get NULL — the full dataset, exactly the pre-fix behavior', () => {
    expect(repairOwnershipFilter(admin)).toBeNull();
  });

  it('a wholesaler gets an owner-or-creator filter on THEIR id', () => {
    expect(repairOwnershipFilter(wholesaler)).toEqual({
      $or: [{ userID: 'ws-marlen' }, { createdBy: 'ws-marlen' }],
    });
  });

  it('a session with no userID matches NOTHING rather than everything', () => {
    // The classic failure: userID undefined → {$or:[{userID:undefined}...]} matches
    // docs WITHOUT the field. The sentinel makes the filter match zero documents.
    const f = repairOwnershipFilter({ user: { role: 'wholesaler' } });
    expect(f.$or[0].userID).toBe('__no_user__');
  });
});

describe('canTouchRepair', () => {
  const marlenRepair = { repairID: 'r1', userID: 'ws-marlen' };
  const createdByMarlen = { repairID: 'r2', userID: 'cust-9', createdBy: 'ws-marlen' };

  it('a wholesaler touches their own repairs (owned or created)', () => {
    expect(canTouchRepair(wholesaler, marlenRepair)).toBe(true);
    expect(canTouchRepair(wholesaler, createdByMarlen)).toBe(true);
  });

  it("REFUSES another wholesaler's repair — the actual breach this closes", () => {
    expect(canTouchRepair(otherWholesaler, marlenRepair)).toBe(false);
    expect(canTouchRepair(otherWholesaler, createdByMarlen)).toBe(false);
  });

  it('staff touch anything (admin behavior unchanged)', () => {
    expect(canTouchRepair(admin, marlenRepair)).toBe(true);
    expect(canTouchRepair(onsiteArtisan, marlenRepair)).toBe(true);
  });

  it('refuses a missing repair and a missing userID', () => {
    expect(canTouchRepair(wholesaler, null)).toBe(false);
    expect(canTouchRepair({ user: { role: 'wholesaler' } }, marlenRepair)).toBe(false);
  });
});
