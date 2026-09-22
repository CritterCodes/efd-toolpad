import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ findOne: vi.fn() }));
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: mocks.findOne }) })) } }));

import { isTermsGatedRole, userNeedsTerms, termsRequiredMessage, sessionNeedsTerms, assertTermsAccepted, termsGateResponse, TERMS_ERROR_CODE } from './termsGate';
import { currentVersion } from './policyRegistry';

const V = currentVersion('artisan-terms');
const artisan = { user: { role: 'artisan', userID: 'user-a1' } };

beforeEach(() => { vi.clearAllMocks(); });

describe('who is gated (pure)', () => {
  it('only artisans; admin, dev, wholesaler, affiliate never', () => {
    expect(isTermsGatedRole('artisan')).toBe(true);
    for (const r of ['admin', 'dev', 'wholesaler', 'affiliate', 'staff', undefined]) expect(isTermsGatedRole(r)).toBe(false);
  });
  it('an artisan who accepted the CURRENT version passes; an older version or none does not', () => {
    expect(userNeedsTerms({ role: 'artisan', agreements: [{ docId: 'artisan-terms', version: V }] })).toBe(false);
    expect(userNeedsTerms({ role: 'artisan', agreements: [{ docId: 'artisan-terms', version: '0.1' }] })).toBe(true);
    expect(userNeedsTerms({ role: 'artisan', agreements: [] })).toBe(true);
    expect(userNeedsTerms({ role: 'admin', agreements: [] })).toBe(false);
  });
  it('the message names the way out, and says "updated" on a version bump', () => {
    expect(termsRequiredMessage({})).toMatch(/Accept the artisan terms under Terms/);
    expect(termsRequiredMessage({ agreements: [{ docId: 'artisan-terms', version: '0.1' }] })).toMatch(new RegExp(`updated \\(v${V.replace('.', '\\.')}\\)`));
  });
});

describe('session gate', () => {
  it('non-artisan sessions short-circuit without touching the database', async () => {
    expect(await sessionNeedsTerms({ user: { role: 'admin', userID: 'x' } })).toEqual({ needs: false, user: null });
    await expect(assertTermsAccepted({ user: { role: 'dev', userID: 'x' } })).resolves.toBeUndefined();
    expect(await termsGateResponse({ user: { role: 'wholesaler', userID: 'x' } })).toBeNull();
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it('an unaccepted artisan is refused with code TERMS_REQUIRED (service) and a 403 (route)', async () => {
    mocks.findOne.mockResolvedValue({ userID: 'user-a1', role: 'artisan', agreements: [] });
    await expect(assertTermsAccepted(artisan)).rejects.toMatchObject({ code: TERMS_ERROR_CODE, policyUrl: '/dashboard/policies' });
    const res = await termsGateResponse(artisan);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'TERMS_REQUIRED', policyUrl: '/dashboard/policies' });
  });

  it('an artisan who accepted the current version proceeds', async () => {
    mocks.findOne.mockResolvedValue({ userID: 'user-a1', role: 'artisan', agreements: [{ docId: 'artisan-terms', version: V, acceptedAt: new Date() }] });
    await expect(assertTermsAccepted(artisan)).resolves.toBeUndefined();
    expect(await termsGateResponse(artisan)).toBeNull();
  });

  it('a missing user record is treated as unaccepted (fail closed)', async () => {
    mocks.findOne.mockResolvedValue(null);
    await expect(assertTermsAccepted(artisan)).rejects.toMatchObject({ code: TERMS_ERROR_CODE });
  });
});
