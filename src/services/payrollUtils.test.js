import { describe, expect, it } from 'vitest';
import {
  PAYROLL_BATCH_STATUS,
  PAYROLL_LOG_STATUS,
  buildPayrollBatchTotals,
  canVoidPayrollBatch,
  getMondayOfWeek,
  getWeekEndFromStart,
  normalizePayrollLogStatus,
} from './payrollUtils';

describe('payrollUtils', () => {
  it('normalizes week boundaries to monday and sunday', () => {
    const monday = getMondayOfWeek('2026-05-01T12:00:00.000Z');
    const weekEnd = getWeekEndFromStart(monday);

    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getHours()).toBe(23);
    expect(weekEnd.getMinutes()).toBe(59);
  });

  it('builds frozen totals from labor logs', () => {
    const totals = buildPayrollBatchTotals([
      { repairID: 'repair-1', creditedLaborHours: 1.5, creditedValue: 75 },
      { repairID: 'repair-2', creditedLaborHours: 0.5, creditedValue: 25 },
      { repairID: 'repair-2', creditedLaborHours: 0.25, creditedValue: 12.5 },
    ]);

    expect(totals).toEqual({
      laborHours: 2.25,
      laborPay: 112.5,
      entryCount: 3,
      repairsWorked: 2,
    });
  });

  it('defaults missing payroll log status to unbatched', () => {
    expect(normalizePayrollLogStatus()).toBe(PAYROLL_LOG_STATUS.UNBATCHED);
    expect(normalizePayrollLogStatus('')).toBe(PAYROLL_LOG_STATUS.UNBATCHED);
    expect(normalizePayrollLogStatus(PAYROLL_LOG_STATUS.BATCHED)).toBe(PAYROLL_LOG_STATUS.BATCHED);
    expect(normalizePayrollLogStatus(PAYROLL_LOG_STATUS.PAID)).toBe(PAYROLL_LOG_STATUS.PAID);
  });

  it('only allows unpaid batches to be voided', () => {
    expect(canVoidPayrollBatch(PAYROLL_BATCH_STATUS.DRAFT)).toBe(true);
    expect(canVoidPayrollBatch(PAYROLL_BATCH_STATUS.FINALIZED)).toBe(true);
    expect(canVoidPayrollBatch(PAYROLL_BATCH_STATUS.PAID)).toBe(false);
    expect(canVoidPayrollBatch(PAYROLL_BATCH_STATUS.VOID)).toBe(false);
  });
});
