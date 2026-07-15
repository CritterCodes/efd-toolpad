import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAndSendStripeInvoice, verifyWebhookSignature } from './stripe';

function response(data, ok = true) {
  return { ok, json: async () => data };
}

describe('custom order Stripe invoices', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_invoice_flow';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_invoice_flow';
    process.env.VERCEL_ENV = 'preview';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.VERCEL_ENV;
  });

  it('creates, finalizes, and sends a hosted Stripe invoice', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ id: 'cus_ronda', email: 'ronda@customer.com' }))
      .mockResolvedValueOnce(response({ id: 'in_ronda', status: 'draft', livemode: false }))
      .mockResolvedValueOnce(response({ id: 'ii_ronda' }))
      .mockResolvedValueOnce(response({ id: 'in_ronda', status: 'open', hosted_invoice_url: 'https://invoice.test/ronda' }))
      .mockResolvedValueOnce(response({ id: 'in_ronda', number: 'TEST-0001', status: 'open', hosted_invoice_url: 'https://invoice.test/ronda', invoice_pdf: 'https://invoice.test/ronda.pdf', livemode: false }));
    vi.stubGlobal('fetch', fetchMock);

    const invoice = await createAndSendStripeInvoice({
      invoiceID: 'cinv-ronda',
      invoiceNumber: 'INV-RONDA',
      customID: 'CO-mrcaads7-e5e581',
      amountInCents: 124682,
      customerEmail: 'ronda@customer.com',
      customerName: 'Ronda Winstead',
      description: 'Wedding Band deposit',
      dueDays: 7,
    });

    expect(invoice).toMatchObject({
      id: 'in_ronda',
      customerID: 'cus_ronda',
      hostedInvoiceUrl: 'https://invoice.test/ronda',
      invoicePdf: 'https://invoice.test/ronda.pdf',
      livemode: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[2][0].endsWith('/v1/invoices')).toBe(true);
    expect(fetchMock.mock.calls[3][0].endsWith('/v1/invoiceitems')).toBe(true);
    expect(fetchMock.mock.calls[3][1].body).toContain('amount=124682');
    expect(fetchMock.mock.calls[5][0].endsWith('/v1/invoices/in_ronda/send')).toBe(true);
  });

  it('refuses test-mode billing in the production deployment', async () => {
    process.env.VERCEL_ENV = 'production';
    vi.stubGlobal('fetch', vi.fn());
    await expect(createAndSendStripeInvoice({
      invoiceID: 'cinv-prod', customID: 'CO-prod', amountInCents: 100,
      customerEmail: 'buyer@customer.com',
    })).rejects.toMatchObject({ code: 'STRIPE_LIVE_REQUIRED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('verifies webhook signatures against the raw body', () => {
    const raw = JSON.stringify({ id: 'evt_paid', type: 'invoice.paid' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
      .update(`${timestamp}.${raw}`, 'utf8')
      .digest('hex');
    expect(verifyWebhookSignature(raw, `t=${timestamp},v1=${signature}`)).toEqual({ id: 'evt_paid', type: 'invoice.paid' });
  });
});
