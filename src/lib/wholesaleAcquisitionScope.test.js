import { describe, it, expect } from 'vitest';
import { canAccessWholesaleAcquisition } from './wholesaleAcquisitionAccess';
import { normalizeCapabilities, CAPABILITY_KEYS } from '@/app/api/users/staffCapabilityRules';
import { generateArtisanNavigation } from './navigation/artisanNavigation';

/**
 * A SCOPE, NOT A PROMOTION.
 *
 * Owner, 2026-10-13: an artisan needs the wholesale leads list â€” "I don't want him to lose all his
 * artisan pages" â€” and asked whether the answer was making him an admin or giving him scopes. It is
 * scopes: `staffCapabilities` already works that way, and the admin role would have swapped his whole
 * navigation out.
 *
 * Two properties have to hold together, and they pull in opposite directions:
 *
 *   1. The scope WORKS off site. Every other capability gate also demands `employment.isOnsite`,
 *      because those describe bench work. Borrowing that gate here would have granted something that
 *      silently does nothing for an off-site holder.
 *   2. The scope grants NOTHING on the bench. It must not become a side door into repair access.
 */

const artisanWith = (caps, employment = {}) => ({
  user: { role: 'artisan', staffCapabilities: caps, employment },
});

describe('who can reach wholesale acquisition', () => {
  it('admits an admin', () => {
    expect(canAccessWholesaleAcquisition({ user: { role: 'admin' } })).toBe(true);
  });

  it('admits an artisan holding the scope, OFF SITE â€” the whole point', () => {
    expect(canAccessWholesaleAcquisition(artisanWith({ wholesaleAcquisition: true }, { isOnsite: false }))).toBe(true);
  });

  it('refuses an artisan without it, however much bench access they have', () => {
    const busy = { repairOps: true, benchWork: true, qualityControl: true, closeoutBilling: true, receiving: true, parts: true };
    expect(canAccessWholesaleAcquisition(artisanWith(busy, { isOnsite: true }))).toBe(false);
  });

  it('refuses a signed-out visitor and a wholesaler', () => {
    expect(canAccessWholesaleAcquisition(null)).toBe(false);
    expect(canAccessWholesaleAcquisition({ user: { role: 'wholesaler' } })).toBe(false);
  });

  it('is not satisfied by a truthy non-true value', () => {
    for (const value of ['true', 1, {}, 'yes']) {
      expect(canAccessWholesaleAcquisition(artisanWith({ wholesaleAcquisition: value }))).toBe(false);
    }
  });
});

describe('the scope does not leak onto the bench', () => {
  it('grants no repair capability', () => {
    const caps = normalizeCapabilities({ wholesaleAcquisition: true });
    expect(caps).toEqual({ wholesaleAcquisition: true });
    for (const repairKey of ['repairOps', 'receiving', 'benchWork', 'parts', 'qualityControl', 'closeoutBilling']) {
      expect(caps[repairKey]).toBeUndefined();
    }
  });

  it('is a known key, so the grant route accepts it rather than throwing', () => {
    expect(CAPABILITY_KEYS).toContain('wholesaleAcquisition');
    expect(() => normalizeCapabilities({ wholesaleAcquisition: true })).not.toThrow();
  });

  it('still rejects a key nobody defined', () => {
    expect(() => normalizeCapabilities({ wholesaleAquisition: true })).toThrow(/Unknown capability/);
  });
});

/**
 * The middleware's own rule, asserted here because it is the gate that silently disagreed.
 *
 * The page guard admitted him, all 13 APIs admitted him, and `middleware.js` bounced him to
 * /dashboard before either could run — its denylist on `/dashboard/admin` predated any artisan having
 * a reason to be there. Three gates agreeing and a fourth quietly refusing is the expensive shape.
 *
 * Mirrors the logic in middleware.js. If that changes, this should fail.
 */
const STAFF_ROLES = ['admin', 'dev', 'staff'];
const SCOPED_STAFF_PATHS = [{ prefix: '/dashboard/admin/wholesale-acquisition', capability: 'wholesaleAcquisition' }];
const middlewareAllows = (pathname, user) => {
  const gated = pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
  if (!gated) return true;
  const scoped = SCOPED_STAFF_PATHS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const byScope = scoped ? user?.staffCapabilities?.[scoped.capability] === true : false;
  return STAFF_ROLES.includes(user?.role) || byScope;
};

describe('the scope opens ONE page, not the admin section', () => {
  const holder = { role: 'artisan', staffCapabilities: { wholesaleAcquisition: true } };

  it('lets the holder through to wholesale acquisition', () => {
    expect(middlewareAllows('/dashboard/admin/wholesale-acquisition', holder)).toBe(true);
  });

  it.each([
    '/dashboard/admin/artisans',
    '/dashboard/admin/settings',
    '/dashboard/admin/repair-tasks',
    '/dashboard/admin',
  ])('still refuses %s', (path) => {
    expect(middlewareAllows(path, holder)).toBe(false);
  });

  it('refuses an artisan without the scope even on that page', () => {
    expect(middlewareAllows('/dashboard/admin/wholesale-acquisition', { role: 'artisan', staffCapabilities: {} })).toBe(false);
  });

  it('leaves staff access exactly as it was', () => {
    expect(middlewareAllows('/dashboard/admin/artisans', { role: 'admin' })).toBe(true);
  });
});

describe('the link exists for the person who holds it', () => {
  const segments = (nav) => nav.filter((i) => i.segment).map((i) => i.segment);

  it('appears for an OFF-SITE artisan â€” otherwise it is a room with no door', () => {
    const nav = generateArtisanNavigation([], { wholesaleAcquisition: true }, { isOnsite: false });
    expect(segments(nav)).toContain('dashboard/admin/wholesale-acquisition');
  });

  it('is absent without the scope', () => {
    const nav = generateArtisanNavigation([], { repairOps: true }, { isOnsite: true });
    expect(segments(nav)).not.toContain('dashboard/admin/wholesale-acquisition');
  });

  it('keeps every artisan page they already had', () => {
    // The reason this is a scope and not a promotion: nothing is taken away.
    const before = segments(generateArtisanNavigation([], {}, {}));
    const after = segments(generateArtisanNavigation([], { wholesaleAcquisition: true }, {}));
    before.forEach((s) => expect(after).toContain(s));
    expect(after.length).toBe(before.length + 1);
  });
});
