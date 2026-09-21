import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));

import {
  applyAccountState,
  liveAccountState,
  withLiveAccountState,
  forgetAccountState,
  clearAccountStateCache,
  ACCOUNT_STATE_TTL_MS,
} from './accountRevocation';

const session = {
  user: {
    userID: 'u-v', name: 'Vernon', role: 'artisan',
    staffCapabilities: { repairOps: true, benchWork: true, qualityControl: true, closeoutBilling: true },
    employment: { isOnsite: true, hourlyRate: 50 },
  },
};

describe('applyAccountState (the kill switch, pure)', () => {
  it('signs out a terminated account even though the token is still valid', () => {
    expect(applyAccountState(session, { status: 'terminated', role: 'artisan' })).toBeNull();
  });

  it('signs out suspended / rejected / missing accounts too', () => {
    expect(applyAccountState(session, { status: 'suspended' })).toBeNull();
    expect(applyAccountState(session, { status: 'rejected' })).toBeNull();
    expect(applyAccountState(session, null)).toBeNull();
  });

  it('overlays the LIVE role, capabilities and employment on an active account', () => {
    const live = applyAccountState(session, {
      status: 'verified', role: 'artisan',
      staffCapabilities: { repairOps: true }, // QC + billing revoked since login
      employment: { isOnsite: false, hourlyRate: 50 },
    });
    expect(live.user.staffCapabilities).toEqual({ repairOps: true });
    expect(live.user.employment.isOnsite).toBe(false);
    expect(live.user.name).toBe('Vernon'); // untouched token fields survive
  });

  it('a stripped capability document becomes null, not the stale token copy', () => {
    const live = applyAccountState(session, { status: 'verified', role: 'artisan' });
    expect(live.user.staffCapabilities).toBeNull();
    expect(live.user.employment).toBeNull();
  });

  it('passes an anonymous session through untouched', () => {
    expect(applyAccountState(null, null)).toBeNull();
    expect(applyAccountState({}, null)).toEqual({});
  });
});

describe('liveAccountState cache', () => {
  beforeEach(() => clearAccountStateCache());

  it('reads once per TTL, then again after it expires or after forgetAccountState', async () => {
    const loader = vi.fn(async () => ({ status: 'verified' }));
    await liveAccountState('u-v', { loader, now: 1000 });
    await liveAccountState('u-v', { loader, now: 1000 + ACCOUNT_STATE_TTL_MS - 1 });
    expect(loader).toHaveBeenCalledTimes(1);
    await liveAccountState('u-v', { loader, now: 1000 + ACCOUNT_STATE_TTL_MS + 1 });
    expect(loader).toHaveBeenCalledTimes(2);
    forgetAccountState('u-v');
    await liveAccountState('u-v', { loader, now: 1000 + ACCOUNT_STATE_TTL_MS + 2 });
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('caches a missing account as null (no hammering the users collection for a deleted user)', async () => {
    const loader = vi.fn(async () => null);
    expect(await liveAccountState('ghost', { loader, now: 1 })).toBeNull();
    expect(await liveAccountState('ghost', { loader, now: 2 })).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('withLiveAccountState', () => {
  beforeEach(() => clearAccountStateCache());

  it('terminated → null; active → overlaid', async () => {
    expect(await withLiveAccountState(session, { loader: async () => ({ status: 'terminated' }) })).toBeNull();
    clearAccountStateCache();
    const live = await withLiveAccountState(session, { loader: async () => ({ status: 'verified', role: 'artisan', staffCapabilities: {} }) });
    expect(live.user.staffCapabilities).toEqual({});
  });

  it('fails OPEN to the token when the database read throws (a blip must not sign the shop out)', async () => {
    const live = await withLiveAccountState(session, { loader: async () => { throw new Error('mongo blip'); } });
    expect(live).toBe(session);
  });
});
