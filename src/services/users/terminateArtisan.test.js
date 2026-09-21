import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repairs/model', () => ({ default: { findById: vi.fn(), updateById: vi.fn() } }));

import {
  buildTerminationUpdate,
  buildReinstateUpdate,
  assertTerminable,
  RELEASABLE_REPAIR_STATUSES,
  FINISHED_WORK_ORDER_STATUSES,
  TERMINATED_STATUS,
} from './terminateArtisan';

const vernon = {
  userID: 'u-v', role: 'artisan', status: 'verified', firstName: 'Vernon',
  staffCapabilities: { repairOps: true, benchWork: true, qualityControl: true },
  employment: { isOnsite: true, hourlyRate: 50 },
};
const owner = { user: { userID: 'u-o', name: 'Jacob', role: 'admin' } };

describe('buildTerminationUpdate', () => {
  it('revokes everything, keeps the pay rate, and records what was there before', () => {
    const now = new Date('2026-09-21T15:00:00Z');
    const set = buildTerminationUpdate({ user: vernon, actor: { userID: 'u-o', name: 'Jacob' }, reason: 'Quit 2026-09-18', now, releasedRepairIDs: ['repair-1'], openWorkOrderIDs: ['wo-9'] });
    expect(set.status).toBe(TERMINATED_STATUS);
    expect(set.staffCapabilities).toEqual({});
    expect(set['employment.isOnsite']).toBe(false);
    expect(set.employment).toBeUndefined(); // dot-path, so hourlyRate survives
    expect(set.termination).toMatchObject({
      at: now, by: 'u-o', byName: 'Jacob', reason: 'Quit 2026-09-18',
      previous: { status: 'verified', role: 'artisan', staffCapabilities: vernon.staffCapabilities, employment: vernon.employment },
      releasedRepairIDs: ['repair-1'], openWorkOrderIDs: ['wo-9'], reinstatedAt: null,
    });
    expect(set.role).toBeUndefined(); // the role is history, not something we rewrite
  });
});

describe('buildReinstateUpdate', () => {
  it('restores sign-in only — no capabilities, no on-site', () => {
    const set = buildReinstateUpdate({ actor: { userID: 'u-o', name: 'Jacob' }, now: new Date('2026-10-01T00:00:00Z') });
    expect(set.status).toBe('verified');
    expect(set['termination.reinstatedBy']).toBe('u-o');
    expect(set.staffCapabilities).toBeUndefined();
    expect(set['employment.isOnsite']).toBeUndefined();
  });
});

describe('assertTerminable', () => {
  it('refuses self, admins, missing and already-terminated accounts', () => {
    expect(() => assertTerminable({ user: null, session: owner })).toThrow(/not found/i);
    expect(() => assertTerminable({ user: { ...vernon, userID: 'u-o' }, session: owner })).toThrow(/your own/i);
    expect(() => assertTerminable({ user: { ...vernon, role: 'admin' }, session: owner })).toThrow(/Admin/);
    expect(() => assertTerminable({ user: { ...vernon, status: 'terminated' }, session: owner })).toThrow(/already/i);
    expect(() => assertTerminable({ user: vernon, session: owner })).not.toThrow();
  });
});

describe('release policy', () => {
  it('releases claimed bench work but never QC or invoiced repairs (the artisan still gets credited)', () => {
    expect(RELEASABLE_REPAIR_STATUSES).toContain('IN PROGRESS');
    expect(RELEASABLE_REPAIR_STATUSES).toContain('READY FOR WORK');
    expect(RELEASABLE_REPAIR_STATUSES).not.toContain('QC');
    expect(RELEASABLE_REPAIR_STATUSES).not.toContain('READY FOR PICKUP');
    expect(RELEASABLE_REPAIR_STATUSES).not.toContain('PAID_CLOSED');
  });

  it('treats UPPERCASE piece work-order completion as finished (prod stores COMPLETED, not completed)', () => {
    expect(FINISHED_WORK_ORDER_STATUSES).toContain('COMPLETED');
    expect(FINISHED_WORK_ORDER_STATUSES).toContain('completed');
    expect(FINISHED_WORK_ORDER_STATUSES).not.toContain('IN PROGRESS');
  });
});
