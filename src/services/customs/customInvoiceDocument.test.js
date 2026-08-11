import { describe, it, expect } from 'vitest';
import {
  buildInvoiceDocument, describePiece, paymentInstructions, assertNoCostBasis, money, DOC_KIND,
} from '@/services/customs/customInvoiceDocument';

/**
 * Built from the REAL order that exposed the gap: Bryce Geels, CO-msnijwee-11bb75. A $5,500 cash
 * payment against a $7,117.56 tax-inclusive total on a natural-diamond ring, leaving $1,617.56.
 * Using the live figures means the arithmetic here is checked against a document a customer actually
 * received rather than a made-up fixture.
 */
const ORDER = {
  customID: 'CO-msnijwee-11bb75',
  customerName: 'Bryce Geels',
  customerEmail: 'buyer@example.com',
  quote: {
    centerstone: { item: '1.5ct I VS2 Natural Diamond', cost: '3949.50' },
    mounting: { item: '14k white gold custom', cost: '303' },
    laborTasks: [{ description: 'set center', cost: 40 }],
    cog: 4557.02, cogMarkup: 2.248, centerstoneMarkup: 1.3,
    quoteTotal: 6500.05, taxRate: 0.095, taxAmount: 617.51, total: 7117.56,
  },
};
const CASH = {
  invoiceID: 'cinv-0f3c09c9', invoiceNumber: 'INV-CO-msnijwee-11bb75-msp0l2s4',
  customID: 'CO-msnijwee-11bb75', amount: 5500, status: 'paid', paymentMethod: 'cash',
  customerEmail: 'buyer@example.com', createdAt: '2026-08-11T18:49:13.300Z', paidAt: '2026-08-11T18:49:17.167Z',
};
const OPTS = { businessName: 'Engel Fine Design', portalUrl: 'https://shop.test/custom-work/portal', zelleHandle: 'pay@efd.test' };

describe('buildInvoiceDocument — the money', () => {
  const doc = buildInvoiceDocument(ORDER, CASH, [CASH], { ...OPTS, kind: DOC_KIND.RECEIPT });

  it('bills against the TAX-INCLUSIVE total, matching what progressFor charges', () => {
    expect(doc.subtotal).toBe(6500.05);
    expect(doc.taxAmount).toBe(617.51);
    expect(doc.projectTotal).toBe(7117.56);
  });

  it('states the balance still owed after a partial payment', () => {
    expect(doc.totalPaid).toBe(5500);
    expect(doc.balanceDue).toBe(1617.56);
    expect(doc.isFullyPaid).toBe(false);
    expect(doc.paymentProgress).toBe(77.3);
  });

  it('SHOWS THE BALANCE ON A RECEIPT, not just on an invoice', () => {
    // A custom job is paid in instalments. A receipt with no balance is how a customer comes to
    // believe they are square when they still owe $1,617.56.
    expect(doc.isReceipt).toBe(true);
    expect(doc.balanceDue).toBeGreaterThan(0);
  });

  it('lists payments applied, oldest first, flagging the one this document is for', () => {
    expect(doc.paymentsApplied).toHaveLength(1);
    expect(doc.paymentsApplied[0]).toMatchObject({ amount: 5500, method: 'cash', isThisDocument: true });
  });

  it('reports paid in full and drops the balance once the last payment lands', () => {
    const final = { ...CASH, invoiceID: 'cinv-2', invoiceNumber: 'INV-2', amount: 1617.56, paidAt: '2026-08-20T15:00:00Z' };
    const paid = buildInvoiceDocument(ORDER, final, [CASH, final], { ...OPTS, kind: DOC_KIND.RECEIPT });
    expect(paid.balanceDue).toBe(0);
    expect(paid.isFullyPaid).toBe(true);
    expect(paid.paymentsApplied.map((p) => p.amount)).toEqual([5500, 1617.56]);   // chronological
    expect(paid.paymentOptions).toEqual([]);                                       // nothing left to pay
  });

  it('falls back to the pre-tax total for orders quoted before sales tax existed', () => {
    const legacy = { ...ORDER, quote: { quoteTotal: 1000 } };
    expect(buildInvoiceDocument(legacy, { amount: 400 }, [{ amount: 400, status: 'paid' }]).projectTotal).toBe(1000);
  });

  it('formats money and dates without drifting by viewer timezone', () => {
    expect(money(1617.56)).toBe('$1,617.56');
    expect(money(0)).toBe('$0.00');
    expect(doc.paidOn).toBe('August 11, 2026');
  });
});

describe('the document never carries EFD cost basis', () => {
  it('describes the piece from item NAMES, never costs', () => {
    expect(describePiece(ORDER.quote)).toBe('14k white gold custom with 1.5ct I VS2 Natural Diamond');
    expect(describePiece({})).toBe('Custom piece');
  });

  it('exposes no cost or markup field anywhere in the model', () => {
    const doc = buildInvoiceDocument(ORDER, CASH, [CASH], OPTS);
    expect(() => assertNoCostBasis(JSON.stringify(doc), ORDER)).not.toThrow();
  });

  it('assertNoCostBasis CATCHES a leaked stone cost — the thing it exists to stop', () => {
    expect(() => assertNoCostBasis('Center stone .......... 3949.50', ORDER))
      .toThrow(/leaked a cost-basis figure/);
    expect(() => assertNoCostBasis('Center stone $3,949.50', ORDER)).toThrow(/leaked/);
  });

  it('catches a leaked markup and a leaked mounting cost too', () => {
    expect(() => assertNoCostBasis('markup 2.248 applied', ORDER)).toThrow(/leaked/);
    expect(() => assertNoCostBasis('mounting 303', ORDER)).toThrow(/leaked/);
  });

  it('does not false-positive on the legitimate customer-facing totals', () => {
    for (const ok of ['$6,500.05', '$617.51', '$7,117.56', '$5,500.00', '$1,617.56', '9.5%']) {
      expect(() => assertNoCostBasis(`Total ${ok}`, ORDER)).not.toThrow();
    }
  });
});

describe('payment instructions', () => {
  it('says Zelle is verified by hand, because silence reads as a lost payment', () => {
    const zelle = paymentInstructions({ ...OPTS, balanceDue: 100 }).find((o) => o.method === 'Zelle');
    expect(zelle.detail).toMatch(/verified by hand/i);
    expect(zelle.detail).toMatch(/email your receipt/i);
    expect(zelle.detail).toMatch(/order number/i);
  });

  it('offers card online, Zelle and in-store while a balance remains', () => {
    expect(paymentInstructions({ ...OPTS, balanceDue: 100 }).map((o) => o.method))
      .toEqual(['Card', 'Zelle', 'Cash or card in store']);
  });

  it('offers nothing once the balance is clear', () => {
    expect(paymentInstructions({ ...OPTS, balanceDue: 0 })).toEqual([]);
  });

  it('omits the card option when no portal url is configured, rather than linking nowhere', () => {
    expect(paymentInstructions({ zelleHandle: 'z@efd.test', balanceDue: 100 }).map((o) => o.method))
      .toEqual(['Zelle', 'Cash or card in store']);
  });
});
