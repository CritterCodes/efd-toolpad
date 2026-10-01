import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Store check-in (POST /api/wholesale/repairs/receive) moves repairs to READY FOR WORK. My Bench lists work
 * orders, so the moved repairs' work orders must be re-synced, or the jobs land on no bench (hotfix 2026-10-01).
 */
const syncFromRepairIDs = vi.fn(async () => ({ synced: 1, failed: [] }));
vi.mock('@/app/api/workOrders/model', () => ({ default: { syncFromRepairIDs: (...a) => syncFromRepairIDs(...a) } }));
vi.mock('@/lib/apiAuth', () => ({
  requireRepairOps: async () => ({ session: { user: { userID: 'staff-1' } }, errorResponse: null }),
}));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn(async () => ({})) }, CHANNELS: {} }));
vi.mock('@/lib/appUrls', () => ({ adminLink: (p) => `http://admin.test${p}` }));

const receivable = [{ repairID: 'repair-1', userID: 'store-1' }, { repairID: 'repair-2', userID: 'store-1' }];
const updateMany = vi.fn(async () => ({ matchedCount: 2, modifiedCount: 2 }));
vi.mock('@/lib/database', () => ({
  db: {
    connect: async () => ({
      collection: (name) => (name === 'repairs'
        ? { find: () => ({ toArray: async () => receivable }), updateMany }
        : { find: () => ({ toArray: async () => [] }) }),
    }),
  },
}));

const { POST } = await import('./route');

describe('store check-in', () => {
  beforeEach(() => { syncFromRepairIDs.mockClear(); updateMany.mockClear(); });

  it('re-syncs the work orders of exactly the repairs it moved, after moving them', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ repairIDs: ['repair-1', 'repair-2', 'repair-already-in'] }) }));
    expect(res.status).toBeLessThan(400);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(syncFromRepairIDs).toHaveBeenCalledWith(['repair-1', 'repair-2']);
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(syncFromRepairIDs.mock.invocationCallOrder[0]);
  });
});
