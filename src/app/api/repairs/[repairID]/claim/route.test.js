import { describe, it, expect, vi, beforeEach } from 'vitest';

/** POST /api/repairs/[repairID]/claim — a repair that doesn't exist is a 404, not a server error. */
const findById = vi.fn();
vi.mock('../../model', () => ({ default: { findById: (...a) => findById(...a), updateById: vi.fn() } }));
vi.mock('@/lib/apiAuth', () => ({
  requireRepairOps: async () => ({ session: { user: { userID: 'u1', name: 'Bea' } }, errorResponse: null }),
}));
vi.mock('@/services/pay/apprentice', () => ({ assertCanHoldWork: async () => {}, apprenticeErrorStatus: () => null }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn() } }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://admin.test' }));

const { POST } = await import('./route');

describe('claim a repair', () => {
  beforeEach(() => { findById.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('answers 404 when the repair does not exist', async () => {
    findById.mockRejectedValue(new Error('Repair not found.'));
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: { repairID: 'repair-nope' } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Repair not found.' });
  });

  it('still answers 500 for anything else', async () => {
    findById.mockRejectedValue(new Error('connection reset'));
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: { repairID: 'repair-1' } });
    expect(res.status).toBe(500);
  });
});
