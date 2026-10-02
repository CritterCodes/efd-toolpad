import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/repairs/[repairID]/complete-from-qc — only a job IN QC can pass QC. Scanning ("Approve QC" on My
 * Bench, 2026-10-01) can pick up any ticket, so the route itself refuses one that isn't in QC.
 *
 * It is also the SECOND QC-pass sink (EFD-DEFECTS B6): the Move page and the scan post straight here, past
 * the bench action, so the peer-review rule has to hold here too.
 */
const findById = vi.fn();
const updateById = vi.fn(async (id) => ({ repairID: id, status: 'COMPLETED' }));
const credit = vi.fn(async () => {});
const autoInvoice = vi.fn(async () => ({ invoiced: false }));
vi.mock('../../model', () => ({ default: { findById: (...a) => findById(...a), updateById: (...a) => updateById(...a) } }));
vi.mock('@/lib/apiAuth', () => ({ requireRepairOps: async () => ({ session: { user: { userID: 'qc-1', name: 'Q' } }, errorResponse: null }) }));
vi.mock('@/services/repairs/benchHandoff', () => ({ creditRepairLaborAtQc: (...a) => credit(...a) }));
vi.mock('@/services/repairs/autoInvoice', () => ({ autoInvoiceAtQcPass: (...a) => autoInvoice(...a) }));
const qcMode = vi.fn(async () => 'separate');
vi.mock('@/services/repairs/qcMode', () => ({ readQcMode: () => qcMode() }));

const { POST } = await import('./route');
const call = (id) => POST(new Request('http://x', { method: 'POST', body: '{}' }), { params: { repairID: id } });

describe('QC sign-off', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('refuses a job that is not in QC — nothing credited, completed or invoiced', async () => {
    findById.mockResolvedValue({ repairID: 'repair-1', status: 'IN PROGRESS' });
    const res = await call('repair-1');
    expect(res.status).toBe(409);
    expect(credit).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
    expect(autoInvoice).not.toHaveBeenCalled();
  });

  it('passes a job that is in QC', async () => {
    findById.mockResolvedValue({ repairID: 'repair-2', status: 'QC', assignedTo: 'someone-else' });
    const res = await call('repair-2');
    expect(res.status).toBe(200);
    expect(credit).toHaveBeenCalledTimes(1);
    expect(updateById).toHaveBeenCalledTimes(1);
    expect(updateById.mock.calls[0][1].qcSelfCertified).toBeUndefined();
  });

  it('refuses the jeweler who did the work — the door the scan opened (B6)', async () => {
    findById.mockResolvedValue({ repairID: 'repair-3', status: 'QC', assignedTo: 'qc-1' });
    const res = await call('repair-3');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/can't pass its QC/) });
    expect(credit).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
    expect(autoInvoice).not.toHaveBeenCalled();
  });

  it('stamps a self-certified pass when the shop allows one', async () => {
    qcMode.mockResolvedValueOnce('self-certify');
    findById.mockResolvedValue({ repairID: 'repair-4', status: 'QC', assignedTo: 'qc-1' });
    const res = await call('repair-4');
    expect(res.status).toBe(200);
    expect(updateById.mock.calls[0][1].qcSelfCertified).toBe(true);
  });
});
