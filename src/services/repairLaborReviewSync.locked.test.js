import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLaborLogLocked } from '@/services/payrollUtils';

/**
 * EFD-DEFECTS P1: a repair change re-flagged its latest labor credit for review with no payroll check, so a
 * credit already batched or paid went back into Labor Review, had its creditedValue zeroed, and a "Finalize
 * Split" there minted new unbatched credits that were paid again.
 */
const { findLatestByRepair, updateById, notifyAllAdmins } = vi.hoisted(() => ({
  findLatestByRepair: vi.fn(),
  updateById: vi.fn(async (id, patch) => ({ logID: id, ...patch })),
  notifyAllAdmins: vi.fn(async () => ({})),
}));
vi.mock('@/app/api/repairLaborLogs/model', () => ({ default: { findLatestByRepair, updateById } }));
vi.mock('@/app/api/repairLaborLogs/utils', () => ({
  hasLaborRelevantRepairChanges: () => true,
  appendLaborReviewSystemNote: (n) => `${n || ''} [re-review]`,
}));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

const { syncLaborLogAfterRepairChange } = await import('./repairLaborReviewSync');
const repair = { repairID: 'repair-1' };

describe('isLaborLogLocked', () => {
  it('locks a batched or paid credit, or one carrying a batch id', () => {
    expect(isLaborLogLocked({ payrollStatus: 'batched' })).toBe(true);
    expect(isLaborLogLocked({ payrollStatus: 'paid' })).toBe(true);
    expect(isLaborLogLocked({ payrollStatus: 'unbatched', payrollBatchID: 'rpay-9' })).toBe(true);
  });
  it('leaves an unbatched credit open', () => {
    expect(isLaborLogLocked({ payrollStatus: 'unbatched', payrollBatchID: '' })).toBe(false);
    expect(isLaborLogLocked({})).toBe(false);
  });
});

describe('a repair change never reopens a paid credit', () => {
  beforeEach(() => { updateById.mockClear(); notifyAllAdmins.mockClear(); });

  it('re-flags an unbatched credit for review, as before', async () => {
    findLatestByRepair.mockResolvedValue({ logID: 'log-1', payrollStatus: 'unbatched', creditedValue: 40 });
    await syncLaborLogAfterRepairChange({ existingRepair: repair, updateData: { tasks: [] } });
    expect(updateById).toHaveBeenCalledWith('log-1', expect.objectContaining({ requiresAdminReview: true, creditedValue: 0 }));
    expect(notifyAllAdmins).not.toHaveBeenCalled();
  });

  it('leaves a paid credit alone and tells an admin instead', async () => {
    findLatestByRepair.mockResolvedValue({ logID: 'log-2', payrollStatus: 'paid', payrollBatchID: 'rpay-7', creditedValue: 40 });
    const r = await syncLaborLogAfterRepairChange({ existingRepair: repair, updateData: { tasks: [] } });
    expect(updateById).not.toHaveBeenCalled();
    expect(r).toEqual({ skipped: 'locked', logID: 'log-2' });
    expect(notifyAllAdmins).toHaveBeenCalledWith(expect.objectContaining({ type: 'labor-review-locked' }));
  });
});
