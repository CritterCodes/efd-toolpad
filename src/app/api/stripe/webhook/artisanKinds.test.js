import { describe, it, expect, vi } from 'vitest';
import { ARTISAN_INVOICE_KIND } from '@/app/api/artisanInvoices/model';

/**
 * The webhook lists the artisan `kind` values literally, so it keeps its lazy-import shape (the
 * customs path must not drag the production models in). A literal copy can drift from the enum — and
 * the consequence of drift is precise and bad: an unrecognised kind falls through every branch, so a
 * paid invoice never settles and a voided one never resolves. The row sits at `pending_payment`, goes
 * overdue at +14 days, and freezes the artisan out of new work with no in-product way to clear it.
 *
 * Adding a seventh kind to ARTISAN_INVOICE_KIND without adding it to the webhook is silent. This is
 * the tripwire.
 */

// Keep the mock surface minimal — importing the route pulls Stripe + customs models.
vi.mock('@/app/api/custom-orders/stripe', () => ({ verifyWebhookSignature: vi.fn() }));
vi.mock('@/services/customs/customInvoices.service', () => ({ setCustomInvoiceStatus: vi.fn() }));
vi.mock('@/app/api/custom-orders/invoices/model', () => ({
  default: { findById: vi.fn(), updateStripeStatus: vi.fn() },
  CUSTOM_INVOICE_STATUS: { PAID: 'paid', CANCELLED: 'cancelled' },
}));
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn() } }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://localhost' }));

const { ARTISAN_KINDS } = await import('./route');

describe('webhook ARTISAN_KINDS', () => {
  it('covers exactly the kinds the artisan rail can mint', () => {
    expect([...ARTISAN_KINDS].sort()).toEqual(Object.values(ARTISAN_INVOICE_KIND).sort());
  });

  it('includes both of the kinds that exist today', () => {
    expect(ARTISAN_KINDS).toContain('artisan_wo_invoice');
    expect(ARTISAN_KINDS).toContain('casting_charge');
  });

  it('does not claim the customs kind', () => {
    // custom_invoice has its own branches and its own model; routing it here would double-resolve it.
    expect(ARTISAN_KINDS).not.toContain('custom_invoice');
  });
});
