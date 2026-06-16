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
