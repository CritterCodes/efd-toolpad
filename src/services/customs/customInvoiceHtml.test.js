import { describe, it, expect } from 'vitest';
import { buildInvoiceDocument, DOC_KIND } from '@/services/customs/customInvoiceDocument';
import { renderCustomInvoiceHtml } from '@/services/customs/customInvoiceHtml';

const ORDER = {
  customID: 'CO-msnijwee-11bb75',
  customerName: 'Bryce Geels',
  quote: {
    centerstone: { item: '1.5ct I VS2 Natural Diamond', cost: '3949.50' },
    mounting: { item: '14k white gold custom', cost: '303' },
    cog: 4557.02, cogMarkup: 2.248, centerstoneMarkup: 1.3,
    quoteTotal: 6500.05, taxRate: 0.095, taxAmount: 617.51, total: 7117.56,
  },
};
const CASH = {
  invoiceID: 'cinv-1', invoiceNumber: 'INV-1', amount: 5500, status: 'paid', paymentMethod: 'cash',
  customerEmail: 'buyer@example.com', createdAt: '2026-08-11T18:49:13Z', paidAt: '2026-08-11T18:49:17Z',
};
const OPTS = { portalUrl: 'https://shop.test/custom-work/portal', zelleHandle: 'pay@efd.test' };
const doc = (kind, invoices = [CASH]) => buildInvoiceDocument(ORDER, CASH, invoices, { ...OPTS, kind });
const html = (kind, o = {}) => renderCustomInvoiceHtml(doc(kind), { order: ORDER, zelleQrSrc: '/logos/zelle-qr.jpg', ...o });

describe('rendered invoice/receipt HTML', () => {
  it('shows the balance due on BOTH the invoice and the receipt', () => {
    expect(html(DOC_KIND.INVOICE)).toMatch(/Balance due[\s\S]*?\$1,617\.56/);
    expect(html(DOC_KIND.RECEIPT)).toMatch(/Balance due[\s\S]*?\$1,617\.56/);
  });

  it('carries the customer-facing totals', () => {
    const out = html(DOC_KIND.RECEIPT);
    for (const v of ['$6,500.05', '$617.51', '$7,117.56', '$5,500.00', '$1,617.56']) expect(out).toContain(v);
  });

  it('NEVER carries the cost basis — the renderer throws if it would', () => {
    // assertNoCostBasis runs inside the renderer, so a template regression fails here, not in the post.
    expect(() => html(DOC_KIND.INVOICE)).not.toThrow();
    expect(html(DOC_KIND.INVOICE)).not.toContain('3,949.50');
    expect(html(DOC_KIND.INVOICE)).not.toContain('2.248');
  });

  it('states the manual Zelle process on the document itself', () => {
    expect(html(DOC_KIND.INVOICE)).toMatch(/verified by hand/i);
  });

  it('links card payment to the shop portal', () => {
    expect(html(DOC_KIND.INVOICE)).toContain('https://shop.test/custom-work/portal');
  });

  it('escapes customer-supplied text rather than injecting it', () => {
    const nasty = { ...ORDER, customerName: '<script>alert(1)</script>' };
    const out = renderCustomInvoiceHtml(
      buildInvoiceDocument(nasty, CASH, [CASH], OPTS), { order: nasty },
    );
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('drops payment options and says paid in full once settled', () => {
    const final = { ...CASH, invoiceID: 'cinv-2', invoiceNumber: 'INV-2', amount: 1617.56 };
    const out = renderCustomInvoiceHtml(
      buildInvoiceDocument(ORDER, final, [CASH, final], { ...OPTS, kind: DOC_KIND.RECEIPT }),
      { order: ORDER },
    );
    expect(out).toContain('Paid in full');
    expect(out).not.toMatch(/How to pay the remaining/);
  });

  it('renders a full document for print and an embeddable fragment for email', () => {
    expect(html(DOC_KIND.INVOICE, { standalone: true })).toMatch(/^<!doctype html>/i);
    const frag = html(DOC_KIND.INVOICE, { standalone: false });
    expect(frag).not.toMatch(/<!doctype/i);
    expect(frag).not.toContain('<button');      // no print button inside an email
  });

  it('omits the Zelle panel when no QR asset is supplied instead of a broken image', () => {
    expect(html(DOC_KIND.INVOICE, { zelleQrSrc: '' })).not.toContain('Zelle payment QR');
  });
});
