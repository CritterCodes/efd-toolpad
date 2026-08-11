import { describe, expect, it } from 'vitest';
import { computePaymentProgress } from '@/services/customs/paymentProgress';

describe('computePaymentProgress', () => {
  it('tracks % paid and the 50% production threshold', () => {
    const below = computePaymentProgress(1000, [{ status: 'paid', amount: 300 }, { status: 'pending_payment', amount: 700 }]);
    expect(below.totalPaid).toBe(300);
    expect(below.totalPending).toBe(700);
    expect(below.paymentProgress).toBe(30);
    expect(below.hasReached50).toBe(false);
    expect(below.canStartProduction).toBe(false);
    expect(below.amountFor50Percent).toBe(200);

    const at50 = computePaymentProgress(1000, [{ status: 'paid', amount: 300 }, { status: 'paid', amount: 250 }]);
    expect(at50.totalPaid).toBe(550);
    expect(at50.hasReached50).toBe(true);
    expect(at50.canStartProduction).toBe(true); // >=50 and <100
    expect(at50.remainingAmount).toBe(450);

    const full = computePaymentProgress(1000, [{ status: 'paid', amount: 1000 }]);
    expect(full.isFullyPaid).toBe(true);
    expect(full.canStartProduction).toBe(false);
  });

  it('ignores cancelled invoices and is zero-safe', () => {
    const r = computePaymentProgress(0, [{ status: 'cancelled', amount: 500 }]);
    expect(r.paymentProgress).toBe(0);
    expect(r.totalPending).toBe(0);
  });
});

/**
 * FLOATING-POINT MONEY. Summing decimal amounts in binary leaves a fraction of a cent behind, so an
 * order paid to the penny reported itself unpaid: 5500 + 1617.56 === 7117.5599999999995, which is not
 * >= 7117.56. The customer's receipt then refuses to say "paid in full" on a settled account, and
 * canStartProduction (hasReached50 && !isFullyPaid) stays true after the final payment.
 */
describe('exact-cent boundaries', () => {
  const paidRows = (...amounts) => amounts.map((amount, i) => ({ amount, status: 'paid', invoiceID: `i${i}` }));

  it('an order paid EXACTLY to its total is fully paid', () => {
    const p = computePaymentProgress(7117.56, paidRows(5500, 1617.56));
    expect(p.isFullyPaid).toBe(true);
    expect(p.remainingAmount).toBe(0);
    expect(p.canStartProduction).toBe(false);
  });

  it('the raw float really does fall short — proving the guard is load-bearing', () => {
    expect(5500 + 1617.56 >= 7117.56).toBe(false);
  });

  it('exactly half is enough to reach the 50% threshold', () => {
    expect(computePaymentProgress(7117.56, paidRows(3558.78)).hasReached50).toBe(true);
  });

  it('a cent short of the total is NOT fully paid', () => {
    const p = computePaymentProgress(7117.56, paidRows(5500, 1617.55));
    expect(p.isFullyPaid).toBe(false);
    expect(p.remainingAmount).toBe(0.01);
  });

  it('a cent short of half has NOT reached the threshold', () => {
    expect(computePaymentProgress(7117.56, paidRows(3558.77)).hasReached50).toBe(false);
  });

  it('overpayment stays fully paid with no negative balance', () => {
    const p = computePaymentProgress(7117.56, paidRows(7200));
    expect(p.isFullyPaid).toBe(true);
    expect(p.remainingAmount).toBe(0);
  });
});
