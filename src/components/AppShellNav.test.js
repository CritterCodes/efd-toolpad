import { describe, it, expect } from 'vitest';
import { buildHref, isLeafActive, getInitials } from './AppShellNav';

/**
 * The sidebar's routing helpers, pulled out of AppShell on 2026-10-02. They run on every page in the app: buildHref
 * decides where a nav item points, isLeafActive decides which item is lit.
 */
describe('buildHref', () => {
  it('builds a child path under its parent', () => {
    // How the nav configs write children: { segment: 'artisans' } under 'dashboard/users'.
    expect(buildHref('artisans', 'dashboard/users')).toBe('/dashboard/users/artisans');
  });

  it('an empty child segment is the parent itself', () => {
    // The configs use { segment: '' } for "the parent's own page".
    expect(buildHref('', 'dashboard/admin/tasks')).toBe('/dashboard/admin/tasks');
    expect(buildHref('')).toBe('/');
  });

  it('leaves an absolute segment alone', () => {
    // e.g. { segment: '/dashboard/admin/artisans' } nested under a different parent.
    expect(buildHref('/dashboard/admin/artisans', 'dashboard/users')).toBe('/dashboard/admin/artisans');
  });

  it('treats a dashboard/ segment as already rooted', () => {
    expect(buildHref('dashboard/products')).toBe('/dashboard/products');
    expect(buildHref('dashboard/products', 'dashboard/users')).toBe('/dashboard/products');
  });

  it('roots a top-level segment with no parent', () => {
    expect(buildHref('clients')).toBe('/clients');
  });
});

describe('isLeafActive', () => {
  it('/dashboard lights only on /dashboard', () => {
    // Without this special case a prefix match would light the home item on every page in the app.
    expect(isLeafActive('/dashboard', '/dashboard', false)).toBe(true);
    expect(isLeafActive('/dashboard/repairs/leads', '/dashboard', false)).toBe(false);
  });

  it('a child lights only on an exact match', () => {
    expect(isLeafActive('/dashboard/admin/tasks', '/dashboard/admin/tasks', true)).toBe(true);
    expect(isLeafActive('/dashboard/admin/tasks/materials', '/dashboard/admin/tasks', true)).toBe(false);
  });

  it('a top-level item also lights for pages beneath it', () => {
    expect(isLeafActive('/dashboard/repairs/leads', '/dashboard/repairs', false)).toBe(true);
    expect(isLeafActive('/dashboard/repairs', '/dashboard/repairs', false)).toBe(true);
  });

  it('does not light a sibling whose path merely starts the same', () => {
    // /dashboard/repairs must not light for /dashboard/repairs-archive.
    expect(isLeafActive('/dashboard/repairs-archive', '/dashboard/repairs', false)).toBe(false);
  });
});

describe('getInitials', () => {
  it('uses first and last name', () => {
    expect(getInitials({ firstName: 'Bea', lastName: 'Bench' })).toBe('BB');
  });

  it('falls back through first name, full name, then email', () => {
    expect(getInitials({ firstName: 'Bea' })).toBe('B');
    expect(getInitials({ name: 'Cal Cutter' })).toBe('CC');
    expect(getInitials({ name: 'Cher' })).toBe('C');
    expect(getInitials({ email: 'someone@example.test' })).toBe('S');
  });

  it('is a question mark when the account has no name at all', () => {
    expect(getInitials({})).toBe('?');
    expect(getInitials()).toBe('?');
  });
});
