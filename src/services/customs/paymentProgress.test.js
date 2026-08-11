import { describe, expect, it } from 'vitest';
import { computePaymentProgress, amountForOrder, invoicesForOrder } from '@/services/customs/paymentProgress';

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

/**
 * COMBINED INVOICES. A client with two custom orders in — Kate Engel has exactly this — should get one
 * invoice, one balance, one swipe. The invoice then covers several orders, and each order still needs
 * to know what it was paid, because status advances to production at 50% and each order spawns its own
 * work orders. Allocation is explicit per order; pro-rata would start bench work on the wrong ring.
 */
describe('per-order allocation from a combined invoice', () => {
  const COMBINED = {
    invoiceID: 'cinv-combined', customID: 'CO-A', customIDs: ['CO-A', 'CO-B'], status: 'paid', amount: 842.42,
    orderSnapshots: [
      { customID: 'CO-A', description: "woman's band", amount: 68.44 },
      { customID: 'CO-B', description: "men's band", amount: 773.98 },
    ],
  };

  it('credits each order exactly what the invoice billed for it', () => {
    expect(amountForOrder(COMBINED, 'CO-A')).toBe(68.44);
    expect(amountForOrder(COMBINED, 'CO-B')).toBe(773.98);
  });

  it('the parts sum to the whole — no money invented or lost', () => {
    expect(amountForOrder(COMBINED, 'CO-A') + amountForOrder(COMBINED, 'CO-B')).toBeCloseTo(COMBINED.amount, 2);
  });

  it('credits nothing to an order the invoice does not cover', () => {
    expect(amountForOrder(COMBINED, 'CO-ELSEWHERE')).toBe(0);
  });

  it('does NOT credit the full combined amount to the primary order', () => {
    // The trap: `customID` is still CO-A for back-compat, so a naive reader would bill CO-A $842.42
    // and trip its 50%-to-production threshold on money that belongs to the other ring.
    expect(amountForOrder(COMBINED, 'CO-A')).not.toBe(COMBINED.amount);
  });

  it('a single-order invoice is unchanged — full amount to its own order, nothing to others', () => {
    const simple = { invoiceID: 'cinv-1', customID: 'CO-A', amount: 500, status: 'paid' };
    expect(amountForOrder(simple, 'CO-A')).toBe(500);
    expect(amountForOrder(simple, 'CO-B')).toBe(0);
  });

  it('drives progress per order, so each reaches 50% on its own merits', () => {
    // CO-B is billed 773.98 of a 1000 project: 77.4%, past the threshold.
    // CO-A is billed 68.44 of a 1000 project: 6.8%, nowhere near it.
    const a = computePaymentProgress(1000, invoicesForOrder([COMBINED], 'CO-A'));
    const b = computePaymentProgress(1000, invoicesForOrder([COMBINED], 'CO-B'));
    expect(a.hasReached50).toBe(false);
    expect(b.hasReached50).toBe(true);
    expect(a.totalPaid).toBe(68.44);
    expect(b.totalPaid).toBe(773.98);
  });

  it('an unpaid combined invoice counts as pending for each order, not paid', () => {
    const pending = { ...COMBINED, status: 'pending_payment' };
    const p = computePaymentProgress(1000, invoicesForOrder([pending], 'CO-B'));
    expect(p.totalPaid).toBe(0);
    expect(p.totalPending).toBe(773.98);
  });

  it('invoicesForOrder drops invoices with no share, so they cannot skew a count', () => {
    expect(invoicesForOrder([COMBINED], 'CO-ELSEWHERE')).toEqual([]);
  });

  it('sums multiple lines for the same order on one invoice', () => {
    const twoLines = { ...COMBINED, orderSnapshots: [
      { customID: 'CO-A', amount: 50 }, { customID: 'CO-A', amount: 18.44 }, { customID: 'CO-B', amount: 773.98 },
    ] };
    expect(amountForOrder(twoLines, 'CO-A')).toBe(68.44);
  });
});

describe('unallocatable invoices are refused, not guessed', () => {
  it('throws when an invoice spans several orders with no snapshots', () => {
    // Guessing is expensive in both directions: credit it whole to each and two rings start production
    // on one payment; credit it to neither and a paid customer waits on a bench that never starts.
    const corrupt = { invoiceID: 'cinv-bad', customID: 'CO-A', customIDs: ['CO-A', 'CO-B'], amount: 900, status: 'paid' };
    expect(() => amountForOrder(corrupt, 'CO-A')).toThrow(/cannot be allocated/);
    expect(() => amountForOrder(corrupt, 'CO-B')).toThrow(/covers 2 orders/);
  });

  it('a single-order invoice still resolves through customIDs when customID is absent', () => {
    expect(amountForOrder({ customIDs: ['CO-A'], amount: 500 }, 'CO-A')).toBe(500);
    expect(amountForOrder({ customIDs: ['CO-A'], amount: 500 }, 'CO-B')).toBe(0);
  });
});
