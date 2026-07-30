import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Middleware STAFF GATE on /dashboard/admin/* (handoff A4).
 *
 * The middleware previously checked only WHETHER a session existed, so any authenticated user —
 * including a freshly approved artisan — could open /dashboard/admin/artisans and approve or reject
 * other applications. This is the page-level twin of the API hole in A2; either half alone leaves the
 * other reachable, so both are tested.
 *
 * Also pinned here: the gate must NOT bleed onto the artisan's own sections. Locking a working
 * artisan out of /dashboard/artisan/* would be a worse regression than the hole being closed.
 */

let session = { user: { userID: 'u', role: 'admin' } };
vi.mock('@/lib/auth', () => ({ auth: async () => session }));

const middleware = (await import('@/middleware')).default;

/** Run the middleware against a path and report where it sent us (null = allowed through). */
async function go(pathname, user) {
  session = user ? { user } : null;
  const res = await middleware({ nextUrl: { pathname }, url: `https://admin.test${pathname}` });
  const location = res?.headers?.get?.('location') || null;
  return location ? new URL(location).pathname : null;
}

const ARTISAN = { userID: 'u-artisan', role: 'artisan' };
const APPLICANT = { userID: 'u-app', role: 'artisan-applicant' };
const CLIENT = { userID: 'u-client', role: 'client' };
const ADMIN = { userID: 'u-admin', role: 'admin' };

beforeEach(() => { session = { user: ADMIN }; });

describe('/dashboard/admin/* is staff-only', () => {
  it.each([
    ['/dashboard/admin'],
    ['/dashboard/admin/artisans'],
    ['/dashboard/admin/settings'],
    ['/dashboard/admin/wholesale-acquisition'],
  ])('redirects a non-staff user away from %s', async (path) => {
    for (const user of [ARTISAN, APPLICANT, CLIENT]) {
      expect(await go(path, user), `${user.role} on ${path}`).toBe('/dashboard');
    }
  });

  it.each([['admin'], ['dev'], ['staff']])('lets %s through', async (role) => {
    expect(await go('/dashboard/admin/artisans', { userID: 'u', role })).toBeNull();
  });

  it('is not fooled by a prefix that merely starts with the same string', async () => {
    // /dashboard/administrivia is NOT /dashboard/admin — an unanchored startsWith would gate it.
    expect(await go('/dashboard/administrivia', ARTISAN)).toBeNull();
  });

  it('an unauthenticated user is sent to sign-in, not to /dashboard', async () => {
    expect(await go('/dashboard/admin/artisans', null)).toBe('/auth/signin');
  });
});

describe('the gate does not bleed onto artisan surfaces', () => {
  it.each([
    ['/dashboard'],
    ['/dashboard/artisan/designs'],
    ['/dashboard/artisan/my-work'],
    ['/dashboard/products/drops'],
    ['/dashboard/customs'],
    ['/dashboard/repairs/my-bench'],
    ['/dashboard/profile'],
    ['/dashboard/production/casting'],
  ])('an artisan still reaches %s', async (path) => {
    expect(await go(path, ARTISAN)).toBeNull();
  });
});

describe('pre-existing behaviour still holds', () => {
  it('forces a password change ahead of everything else', async () => {
    expect(await go('/dashboard/admin/artisans', { ...ADMIN, mustChangePassword: true })).toBe('/auth/change-password');
  });
  it('keeps /api/* out of the middleware entirely (routes own their auth)', async () => {
    expect(await go('/api/admin/artisans', null)).toBeNull();
  });
});
