import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `invoice.voided` for ARTISAN kinds — the half of the rail that was missing.
 *
 * `invoice.paid` has routed artisan kinds since S5, but voiding in Stripe left our row at
 * `pending_payment`: it went overdue at +14 days and froze the artisan out of new runs and work
 * orders, over an invoice that had been cancelled and could no longer be paid. That asymmetry is
 * exactly what castingSettlement warns about — "every exit from an invoiced state must resolve the
 * invoice… Getting this wrong is worse than never billing at all."
 *
 * The PAID guard is the safety argument for this branch, and the PENDING-only condition protects the
 * audit trail, so both are pinned here rather than left to the kinds-list test (which only checks that
 * the literal list matches the enum, and would pass with this branch deleted entirely).
 */

const verifyWebhookSignature = vi.fn();
const findById = vi.fn();
const markVoid = vi.fn();
const markArtisanInvoicePaid = vi.fn();

vi.mock('@/app/api/custom-orders/stripe', () => ({
  verifyWebhookSignature: (...a) => verifyWebhookSignature(...a),
}));
vi.mock('@/services/customs/customInvoices.service', () => ({ setCustomInvoiceStatus: vi.fn() }));
vi.mock('@/app/api/custom-orders/invoices/model', () => ({
  default: { findById: vi.fn(), updateStripeStatus: vi.fn() },
  CUSTOM_INVOICE_STATUS: { PAID: 'paid', CANCELLED: 'cancelled' },
}));
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn() } }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://localhost' }));
vi.mock('@/app/api/artisanInvoices/model', () => ({
  default: { findById: (...a) => findById(...a), markVoid: (...a) => markVoid(...a) },
  ARTISAN_INVOICE_STATUS: { PENDING: 'pending_payment', PAID: 'paid', VOID: 'void' },
}));
vi.mock('@/services/production/artisanBilling', () => ({
  markArtisanInvoicePaid: (...a) => markArtisanInvoicePaid(...a),
}));

const { POST } = await import('./route');

const fire = (type, metadata, status = 'void') => {
  verifyWebhookSignature.mockReturnValue({ type, data: { object: { metadata, status } } });
  return POST(new Request('http://localhost/webhook', { method: 'POST', body: '{}' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue({ invoiceID: 'ainv-1', status: 'pending_payment' });
});

describe('invoice.voided — artisan kinds', () => {
  it('voids a pending work-order invoice — the missing exit', async () => {
    await fire('invoice.voided', { kind: 'artisan_wo_invoice', invoiceID: 'ainv-1' });
    expect(markVoid).toHaveBeenCalledWith('ainv-1', expect.any(String));
  });

  it('voids a pending casting charge too', async () => {
    await fire('invoice.voided', { kind: 'casting_charge', invoiceID: 'ainv-1' });
    expect(markVoid).toHaveBeenCalledWith('ainv-1', expect.any(String));
  });

  it('NEVER walks back a paid invoice', async () => {
    // markPaid already cleared the casting shipping gate; un-paying via a replayed event would
    // re-freeze the artisan and contradict money that has actually moved.
    findById.mockResolvedValue({ invoiceID: 'ainv-1', status: 'paid' });
    await fire('invoice.voided', { kind: 'artisan_wo_invoice', invoiceID: 'ainv-1' });
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('is idempotent on an already-void row, preserving the original reason', async () => {
    findById.mockResolvedValue({ invoiceID: 'ainv-1', status: 'void', voidReason: 'duplicate (a@efd.com)' });
    await fire('invoice.voided', { kind: 'artisan_wo_invoice', invoiceID: 'ainv-1' });
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('ignores an unknown invoice', async () => {
    findById.mockResolvedValue(null);
    await fire('invoice.voided', { kind: 'artisan_wo_invoice', invoiceID: 'nope' });
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('does not touch the artisan rail for a customs void', async () => {
    await fire('invoice.voided', { kind: 'custom_invoice', customID: 'c-1', invoiceID: 'inv-1' });
    expect(markVoid).not.toHaveBeenCalled();
  });

  it('needs an invoiceID in the metadata', async () => {
    await fire('invoice.voided', { kind: 'artisan_wo_invoice' });
    expect(findById).not.toHaveBeenCalled();
    expect(markVoid).not.toHaveBeenCalled();
  });
});

describe('invoice.paid — artisan kinds still route (the half that already worked)', () => {
  it('settles a paid artisan invoice', async () => {
    await fire('invoice.paid', { kind: 'casting_charge', invoiceID: 'ainv-1' }, 'paid');
    expect(markArtisanInvoicePaid).toHaveBeenCalledWith('ainv-1');
  });

  it('ignores a paid event whose Stripe status is not actually paid', async () => {
    await fire('invoice.paid', { kind: 'casting_charge', invoiceID: 'ainv-1' }, 'open');
    expect(markArtisanInvoicePaid).not.toHaveBeenCalled();
  });
});
