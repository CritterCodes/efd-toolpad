import { describe, it, expect } from 'vitest';
import { splitBatchPay, payrollTotal } from './payrollUtils';

describe('splitBatchPay / payrollTotal', () => {
  it('reads the explicit totalPay when a batch has one (post 2026-09-22 shape)', () => {
    expect(splitBatchPay({ laborPay: 20, salePay: 496, totalPay: 516 })).toEqual({ laborPay: 20, salePay: 496, totalPay: 516 });
    expect(payrollTotal({ laborPay: 20, salePay: 496, totalPay: 516 })).toBe(516);
  });

  it('treats a legacy weekly batch laborPay as the TOTAL — never adds salePay on top again', () => {
    // rpay-49247705 in prod: labor 20 + sales 496 was stored as laborPay 516 / salePay 496
    expect(splitBatchPay({ laborPay: 516, salePay: 496 })).toEqual({ laborPay: 20, salePay: 496, totalPay: 516 });
    expect(payrollTotal({ laborPay: 516, salePay: 496 })).toBe(516);
  });

  it('treats a legacy daily batch laborPay as labor-only', () => {
    expect(payrollTotal({ cadence: 'daily', laborPay: 100, salePay: 25 })).toBe(125);
  });

  it('is safe on empty and rounds to cents', () => {
    expect(payrollTotal({})).toBe(0);
    expect(payrollTotal({ totalPay: 0.1 + 0.2 })).toBe(0.3);
  });
});
