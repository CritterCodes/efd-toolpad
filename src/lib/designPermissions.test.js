import { describe, expect, it } from 'vitest';
import { canCreateDesignCategory, canManageDesign, designListFilter, sessionArtisanTypes } from '@/lib/designPermissions';

const s = (role, artisanTypes = [], userID = 'user-1') => ({ user: { role, artisanTypes, userID, email: 'a@x.com' } });

describe('sessionArtisanTypes', () => {
  it('normalizes raw Title Case labels (array shape)', () => {
    expect(sessionArtisanTypes(s('artisan', ['Gem Cutter', 'CAD Designer']))).toEqual(['gem-cutter', 'cad-designer']);
  });
  it('empty for missing types', () => {
    expect(sessionArtisanTypes(s('artisan'))).toEqual([]);
  });
});

describe('canCreateDesignCategory (owner matrix)', () => {
  it('staff can create anything', () => {
    expect(canCreateDesignCategory(s('admin'), 'gemstone')).toBe(true);
    expect(canCreateDesignCategory(s('staff'), 'ring')).toBe(true);
  });
  it('gem cutters create gemstone designs; jewelry crew cannot', () => {
    expect(canCreateDesignCategory(s('artisan', ['Gem Cutter']), 'gemstone')).toBe(true);
    expect(canCreateDesignCategory(s('artisan', ['Jeweler']), 'gemstone')).toBe(false);
  });
  it('jewelers/engravers/CAD designers create jewelry; gem cutters cannot', () => {
    expect(canCreateDesignCategory(s('artisan', ['Jeweler']), 'ring')).toBe(true);
    expect(canCreateDesignCategory(s('artisan', ['Engraver']), 'pendant')).toBe(true);
    expect(canCreateDesignCategory(s('artisan', ['CAD Designer']), null)).toBe(true);
    expect(canCreateDesignCategory(s('artisan', ['Gem Cutter']), 'ring')).toBe(false);
  });
  it('multi-type artisans pass both gates', () => {
    const critter = s('artisan', ['Jeweler', 'Gem Cutter', 'CAD Designer']);
    expect(canCreateDesignCategory(critter, 'gemstone')).toBe(true);
    expect(canCreateDesignCategory(critter, 'ring')).toBe(true);
  });
  it('non-artisan non-staff roles are denied', () => {
    expect(canCreateDesignCategory(s('wholesaler', ['Jeweler']), 'ring')).toBe(false);
  });
});

describe('canManageDesign (ownership scoping)', () => {
  const gemDesign = { category: 'gemstone', primaryArtisanId: 'user-1' };
  it('staff manage anything', () => {
    expect(canManageDesign(s('admin'), gemDesign)).toBe(true);
  });
  it('the owning gem cutter manages their gemstone design', () => {
    expect(canManageDesign(s('artisan', ['Gem Cutter'], 'user-1'), gemDesign)).toBe(true);
  });
  it('a DIFFERENT gem cutter is denied', () => {
    expect(canManageDesign(s('artisan', ['Gem Cutter'], 'user-2'), gemDesign)).toBe(false);
  });
  it('the owner is denied when their type does not cover the category', () => {
    expect(canManageDesign(s('artisan', ['Jeweler'], 'user-1'), gemDesign)).toBe(false);
  });
  it('unowned designs are staff-only', () => {
    expect(canManageDesign(s('artisan', ['Jeweler'], 'user-1'), { category: 'ring', primaryArtisanId: null })).toBe(false);
  });
});

describe('designListFilter', () => {
  it('staff see everything', () => {
    expect(designListFilter(s('admin'))).toEqual({});
  });
  it('artisans are scoped to their own designs', () => {
    expect(designListFilter(s('artisan', ['Jeweler'], 'user-7'))).toEqual({ primaryArtisanId: 'user-7' });
  });
});
