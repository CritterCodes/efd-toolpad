import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * PUT / DELETE /api/wholesale/repairs/[repairId] are ADMIN ONLY (2026-10-01): before, any owner of a repair could
 * $set any field on it or delete it mid-work, writing the collection directly (stale or orphaned work orders).
 */
let role = 'wholesaler';
const updateById = vi.fn(async (id, data) => ({ repairID: id, ...data }));
const deleteById = vi.fn(async () => ({}));
const findById = vi.fn(async (id) => ({ repairID: id }));
vi.mock('@/lib/apiAuth', () => ({
  requireRole: async (roles) => (roles.includes(role)
    ? { session: { user: { userID: 'u1', role } }, errorResponse: null }
    : { session: null, errorResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }),
}));
vi.mock('@/app/api/repairs/model', () => ({ default: { updateById: (...a) => updateById(...a), deleteById: (...a) => deleteById(...a), findById: (...a) => findById(...a) } }));

const { PUT, DELETE } = await import('./route');
const put = (body) => PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ repairId: 'repair-1' }) });
const del = () => DELETE(new Request('http://x', { method: 'DELETE' }), { params: Promise.resolve({ repairId: 'repair-1' }) });

describe('the store repair edit/delete route', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('refuses a store — no field written, nothing deleted', async () => {
    role = 'wholesaler';
    expect((await put({ status: 'COMPLETED', totalCost: 0 })).status).toBe(403);
    expect((await del()).status).toBe(403);
    expect(updateById).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it('lets an admin update through the model (which syncs the work order) and delete with full cleanup', async () => {
    role = 'admin';
    expect((await put({ notes: 'x', repairID: 'hijack' })).status).toBe(200);
    expect(updateById).toHaveBeenCalledWith('repair-1', expect.objectContaining({ notes: 'x' }));
    expect(updateById.mock.calls[0][1]).not.toHaveProperty('repairID');
    expect((await del()).status).toBe(200);
    expect(deleteById).toHaveBeenCalledWith('repair-1');
  });
});
