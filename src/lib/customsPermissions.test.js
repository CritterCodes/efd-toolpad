import { describe, expect, it } from 'vitest';
import { isAssignedToOrder, customsListFilter } from '@/lib/customsPermissions';

const s = (role, userID = 'user-1') => ({ user: { role, userID, email: 'a@x.com' } });
const order = { assignments: [{ id: 'a1', userID: 'user-1', role: 'bench' }, { id: 'a2', userID: 'user-3', role: 'cad' }] };

describe('isAssignedToOrder', () => {
  it('matches an assigned artisan (any role on the order)', () => {
    expect(isAssignedToOrder(s('artisan', 'user-1'), order)).toBe(true);
    expect(isAssignedToOrder(s('artisan', 'user-3'), order)).toBe(true);
  });
  it('rejects unassigned artisans and empty orders', () => {
    expect(isAssignedToOrder(s('artisan', 'user-9'), order)).toBe(false);
    expect(isAssignedToOrder(s('artisan', 'user-1'), { assignments: [] })).toBe(false);
    expect(isAssignedToOrder(s('artisan', 'user-1'), {})).toBe(false);
  });
});

describe('customsListFilter', () => {
  it('staff see everything', () => {
    expect(customsListFilter(s('admin'))).toEqual({});
  });
  it('artisans are scoped to orders they are assigned to', () => {
    const f = customsListFilter(s('artisan', 'user-7'));
    expect(f['assignments.userID'].$in).toContain('user-7');
  });
});
