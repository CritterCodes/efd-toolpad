import { describe, expect, it } from 'vitest';
import { calculateCustomInvoice, isBillableEmail } from './customInvoicePolicy';

describe('custom invoice policy', () => {
  it('rejects placeholder customer email addresses', () => {
    expect(isBillableEmail('test@test.com')).toBe(false);
    expect(isBillableEmail('buyer@example.test')).toBe(false);
    expect(isBillableEmail('ronda@example.com')).toBe(false);
    expect(isBillableEmail('ronda@customer.com')).toBe(true);
  });

  it('calculates Ronda\'s 50% deposit on the server', () => {
    expect(calculateCustomInvoice({
      type: 'deposit',
      depositPct: 50,
      dueDays: 7,
      progress: { projectTotal: 2493.64, totalPaid: 0, totalPending: 0 },
    })).toEqual({ amount: 1246.82, dueDays: 7, available: 2493.64 });
  });

  it('prevents pending invoices from overbilling the project', () => {
    expect(() => calculateCustomInvoice({
      type: 'partial',
      amount: 800,
      progress: { projectTotal: 1000, totalPaid: 100, totalPending: 200 },
    })).toThrow('Invoice exceeds the uninvoiced balance of $700.00.');
  });
});
