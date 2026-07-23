import { describe, expect, it } from 'vitest';
import { canCreateDrop, canManageDrop, canViewDrop, dropListFilter, validateArtisanDropPatch } from '@/lib/dropPermissions';

const s = (role, artisanTypes = [], userID = 'user-1') => ({ user: { role, artisanTypes, userID, email: 'a@x.com' } });
const artisanDrop = { ownerType: 'artisan', ownerId: 'user-1', collaborators: ['user-2'], status: 'draft' };
const efdDrop = { ownerType: 'efd', ownerId: null, collaborators: [], status: 'draft' };

describe('canCreateDrop', () => {
  it('staff and design-authoring artisans can open a drop', () => {
    expect(canCreateDrop(s('admin'))).toBe(true);
    expect(canCreateDrop(s('artisan', ['Jeweler']))).toBe(true);
    expect(canCreateDrop(s('artisan', ['Gem Cutter']))).toBe(true);
  });
  it('non-authoring artisans and other roles cannot', () => {
    expect(canCreateDrop(s('artisan', ['Photographer']))).toBe(false);
    expect(canCreateDrop(s('wholesaler', ['Jeweler']))).toBe(false);
  });
});

describe('canManageDrop / canViewDrop', () => {
  it('the owning artisan controls their drop', () => {
    expect(canManageDrop(s('artisan', ['Jeweler'], 'user-1'), artisanDrop)).toBe(true);
  });
  it('a collaborator can VIEW but not manage', () => {
    const collab = s('artisan', ['Jeweler'], 'user-2');
    expect(canViewDrop(collab, artisanDrop)).toBe(true);
    expect(canManageDrop(collab, artisanDrop)).toBe(false);
  });
  it('an unrelated artisan sees nothing', () => {
    const outsider = s('artisan', ['Jeweler'], 'user-9');
    expect(canViewDrop(outsider, artisanDrop)).toBe(false);
    expect(canManageDrop(outsider, artisanDrop)).toBe(false);
  });
  it('EFD drops are staff-only to manage', () => {
    expect(canManageDrop(s('artisan', ['Jeweler'], 'user-1'), efdDrop)).toBe(false);
    expect(canManageDrop(s('admin'), efdDrop)).toBe(true);
  });
});

describe('dropListFilter', () => {
  it('staff see everything', () => {
    expect(dropListFilter(s('admin'))).toEqual({});
  });
  it('artisans are scoped to owned + collaborating drops', () => {
    const f = dropListFilter(s('artisan', ['Jeweler'], 'user-7'));
    expect(f.$or[0].ownerType).toBe('artisan');
    expect(f.$or[0].ownerId.$in).toContain('user-7');
    expect(f.$or[1].collaborators.$in).toContain('user-7');
  });
});

describe('validateArtisanDropPatch — releasing stays with EFD', () => {
  const existing = { status: 'draft', releaseAt: null, releasedAt: null, ownerType: 'artisan', ownerId: 'user-1' };
  it('allows curation edits (name, designOrder, collaborators, keeping draft)', () => {
    expect(validateArtisanDropPatch({ name: 'X', designOrder: ['a'], collaborators: ['user-2'], status: 'draft' }, existing).ok).toBe(true);
  });
  it('blocks scheduling/releasing/archiving', () => {
    expect(validateArtisanDropPatch({ status: 'scheduled' }, existing).ok).toBe(false);
    expect(validateArtisanDropPatch({ status: 'released' }, existing).ok).toBe(false);
    expect(validateArtisanDropPatch({ releaseAt: '2026-08-01' }, existing).ok).toBe(false);
  });
  it('blocks ownership reassignment', () => {
    expect(validateArtisanDropPatch({ ownerId: 'user-2' }, existing).ok).toBe(false);
    expect(validateArtisanDropPatch({ ownerType: 'efd' }, existing).ok).toBe(false);
  });
});
