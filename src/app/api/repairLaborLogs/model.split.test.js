import { describe, it, expect, vi } from 'vitest';

/**
 * model.js was split on 2026-10-01 (max-lines): reports and payroll moved to ./reports and ./payroll and the class
 * kept delegates, because ~20 callers (payroll, billing, analytics, commissions) and their vi.mocks use the class.
 * Pin that every moved method is still on the class and forwards its arguments unchanged.
 */
const reports = vi.hoisted(() => ({ weeklyReport: vi.fn(), weeklyBreakdown: vi.fn(), getDiagnostics: vi.fn() }));
const payroll = vi.hoisted(() => ({
  buildUnbatchedMatch: vi.fn(), listPayrollCandidates: vi.fn(), payrollCandidateBreakdown: vi.fn(),
  assignToPayrollBatch: vi.fn(), markBatchPaid: vi.fn(), releasePayrollBatch: vi.fn(),
}));
vi.mock('./reports', () => reports);
vi.mock('./payroll', () => payroll);
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));

const { default: RepairLaborLogsModel } = await import('./model');

describe('RepairLaborLogsModel delegates the moved methods', () => {
  it.each(Object.keys(reports))('reports.%s', (name) => {
    reports[name].mockReturnValue(`r:${name}`);
    expect(RepairLaborLogsModel[name]({ weekStart: '2026-09-28', userID: 'u1' })).toBe(`r:${name}`);
    expect(reports[name]).toHaveBeenCalledWith({ weekStart: '2026-09-28', userID: 'u1' });
  });

  it.each(['buildUnbatchedMatch', 'listPayrollCandidates', 'payrollCandidateBreakdown'])('payroll.%s', (name) => {
    payroll[name].mockReturnValue(`p:${name}`);
    expect(RepairLaborLogsModel[name]({ ownerUserIDs: ['o'] })).toBe(`p:${name}`);
    expect(payroll[name]).toHaveBeenCalledWith({ ownerUserIDs: ['o'] });
  });

  it('batch writes keep their positional arguments', () => {
    const at = new Date('2026-10-01T00:00:00Z');
    RepairLaborLogsModel.assignToPayrollBatch(['l1'], 'b1');
    RepairLaborLogsModel.markBatchPaid('b1', at);
    RepairLaborLogsModel.releasePayrollBatch('b1');
    expect(payroll.assignToPayrollBatch).toHaveBeenCalledWith(['l1'], 'b1');
    expect(payroll.markBatchPaid).toHaveBeenCalledWith('b1', at);
    expect(payroll.releasePayrollBatch).toHaveBeenCalledWith('b1');
  });

  it('keeps the collection name', () => {
    expect(RepairLaborLogsModel.COLLECTION).toBe('laborLogs');
  });
});
