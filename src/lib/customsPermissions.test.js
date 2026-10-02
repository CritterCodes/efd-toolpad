import { describe, expect, it } from 'vitest';
import { isAssignedToOrder, isAssignedCadDesigner, customsListFilter } from '@/lib/customsPermissions';

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

/**
 * The design model is the one write on a custom order that belongs to an artisan rather than to staff.
 * It is narrower than read access on purpose: a bench jeweller or a stone cutter assigned to the same
 * order has no business setting the GLB and its viewer config.
 *
 * The audit this came from: the GLB-stage designer's own bench card shows a gold "Assign materials → QC"
 * button, which opens a page that saves through `PUT .../design-model` — and that route was staff-only,
 * so the button led straight to a refusal.
 */
describe('isAssignedCadDesigner', () => {
  it('matches the order’s CAD designer', () => {
    expect(isAssignedCadDesigner(s('artisan', 'user-3'), order)).toBe(true);
  });

  it('does not match a bench jeweller on the same order', () => {
    // user-1 IS assigned — as bench. Read access, yes; the design model, no.
    expect(isAssignedToOrder(s('artisan', 'user-1'), order)).toBe(true);
    expect(isAssignedCadDesigner(s('artisan', 'user-1'), order)).toBe(false);
  });

  it('does not match an unassigned artisan, or an order with no assignments', () => {
    expect(isAssignedCadDesigner(s('artisan', 'user-9'), order)).toBe(false);
    expect(isAssignedCadDesigner(s('artisan', 'user-3'), { assignments: [] })).toBe(false);
    expect(isAssignedCadDesigner(s('artisan', 'user-3'), {})).toBe(false);
  });

  it('matches on email too, the same way read access does', () => {
    const byEmail = { assignments: [{ id: 'a1', userID: 'a@x.com', role: 'cad' }] };
    expect(isAssignedCadDesigner(s('artisan', 'user-5'), byEmail)).toBe(true);
  });
});
