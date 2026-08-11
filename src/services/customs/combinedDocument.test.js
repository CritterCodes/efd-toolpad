import { describe, it, expect } from 'vitest';
import { buildCombinedInvoiceDocument, DOC_KIND } from '@/services/customs/customInvoiceDocument';
import { renderCustomInvoiceHtml } from '@/services/customs/customInvoiceHtml';

/**
 * Kate Engel's two bands on one invoice. Amounts on an invoice are TAX-INCLUSIVE, so the subtotal and
 * tax lines must be backed OUT of them — presenting the billed amount as pre-tax and adding tax on top
 * would overstate the total by the tax on the tax.
 */
const ORDERS = [
  { customID: 'CO-A', customerName: 'Kate Engel', customerEmail: 'kate@gmail.com',
    quote: { mounting: { item: '14k white band' }, total: 1000, quoteTotal: 913.24, taxRate: 0.095 } },
  { customID: 'CO-B', customerName: 'Kate Engel', customerEmail: 'kate@gmail.com',
    quote: { mounting: { item: '14k mens band' }, total: 2000, quoteTotal: 1826.48, taxRate: 0.095 } },
];
const COMBINED = {
  invoiceID: 'cinv-c', invoiceNumber: 'INV-C', customID: 'CO-A', customIDs: ['CO-A', 'CO-B'],
  amount: 1500, status: 'pending_payment', taxRate: 0.095, customerEmail: 'kate@gmail.com',
  createdAt: '2026-08-11T12:00:00Z',
  orderSnapshots: [
    { customID: 'CO-A', description: "Woman's band", amount: 500, taxRate: 0.095 },
    { customID: 'CO-B', description: "Men's band", amount: 1000, taxRate: 0.095 },
  ],
};
const OPTS = { portalUrl: 'https://shop.test/custom-work/portal' };
const doc = (kind, invoices = [COMBINED]) => buildCombinedInvoiceDocument(ORDERS, invoices[0], invoices, { ...OPTS, kind });

describe('combined invoice document', () => {
  const d = doc(DOC_KIND.INVOICE);

  it('lists one line per order, each with its own billed amount', () => {
    expect(d.lineItems.map((l) => [l.label, l.amount])).toEqual([["Woman's band", 500], ["Men's band", 1000]]);
  });

  it('the lines sum to the amount due — one payment, one swipe', () => {
    expect(d.lineItems.reduce((s, l) => s + l.amount, 0)).toBe(d.documentAmount);
    expect(d.documentAmount).toBe(1500);
  });

  it('backs tax OUT of the tax-inclusive amounts rather than adding it on top', () => {
    // 1500 inclusive at 9.5% → tax 130.14, subtotal 1369.86. Adding on top would have said 1642.50.
    expect(d.taxAmount).toBeCloseTo(130.14, 2);
    expect(d.subtotal).toBeCloseTo(1369.86, 2);
    expect(d.subtotal + d.taxAmount).toBeCloseTo(1500, 2);
  });

  it('names both orders rather than pretending to be about one', () => {
    expect(d.orderNumbers).toEqual(['CO-A', 'CO-B']);
    expect(d.isCombined).toBe(true);
  });

  it('reports what remains across the covered orders, not just this invoice', () => {
    // Nothing paid yet: 1000 + 2000 outstanding.
    expect(d.groupBalance).toBe(3000);
  });

  it('a receipt shows the group balance still owed after the payment lands', () => {
    const paid = { ...COMBINED, status: 'paid', paymentMethod: 'card', paidAt: '2026-08-12T12:00:00Z' };
    const r = buildCombinedInvoiceDocument(ORDERS, paid, [paid], { ...OPTS, kind: DOC_KIND.RECEIPT });
    expect(r.groupBalance).toBe(1500);          // 3000 project − 1500 paid
    expect(r.paymentsApplied[0].amount).toBe(1500);
    expect(r.paymentsApplied[0].isCombined).toBe(true);
  });

  it('renders both orders as rows in the printed/emailed document', () => {
    const html = renderCustomInvoiceHtml(d, { order: null });
    // Apostrophes arrive escaped — that is the renderer doing its job, not a mismatch.
    expect(html).toContain('Woman&#39;s band');
    expect(html).toContain('Men&#39;s band');
    expect(html).toContain('Order CO-A');
    expect(html).toContain('$1,500.00');
  });

  it('headlines the figure to settle, not each project total', () => {
    const html = renderCustomInvoiceHtml(d, { order: null });
    expect(html).toContain('Amount due');
    expect(html).not.toContain('Project total');   // four large numbers would bury the one that matters
    expect(html).toContain('Remaining on these orders');
  });

  it('a receipt headlines the amount paid', () => {
    const paid = { ...COMBINED, status: 'paid', paymentMethod: 'cash', paidAt: '2026-08-12T12:00:00Z' };
    const html = renderCustomInvoiceHtml(
      buildCombinedInvoiceDocument(ORDERS, paid, [paid], { ...OPTS, kind: DOC_KIND.RECEIPT }), { order: null },
    );
    expect(html).toContain('Amount paid');
    expect(html).toContain('Remaining on these orders');
  });

  it('handles mixed tax rates across the covered orders', () => {
    const mixed = { ...COMBINED, orderSnapshots: [
      { customID: 'CO-A', description: 'A', amount: 500, taxRate: 0.095 },
      { customID: 'CO-B', description: 'B', amount: 1000, taxRate: 0 },     // e.g. a resale-exempt order
    ] };
    const m = buildCombinedInvoiceDocument(ORDERS, mixed, [mixed], OPTS);
    expect(m.taxAmount).toBeCloseTo(43.38, 2);   // tax only on the 500
    expect(m.subtotal + m.taxAmount).toBeCloseTo(1500, 2);
  });
});
