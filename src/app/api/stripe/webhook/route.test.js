import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  verifyWebhookSignature,
  setCustomInvoiceStatus,
  findInvoiceById,
  updateStripeStatus,
} = vi.hoisted(() => ({
  verifyWebhookSignature: vi.fn(),
  setCustomInvoiceStatus: vi.fn(),
  findInvoiceById: vi.fn(),
  updateStripeStatus: vi.fn(),
}));

vi.mock('@/app/api/custom-orders/stripe', () => ({ verifyWebhookSignature }));
vi.mock('@/services/customs/customInvoices.service', () => ({ setCustomInvoiceStatus }));
vi.mock('@/app/api/custom-orders/invoices/model', () => ({
  default: { findById: findInvoiceById, updateStripeStatus },
  CUSTOM_INVOICE_STATUS: { PAID: 'paid', CANCELLED: 'cancelled' },
}));
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));

import { POST } from './route';

function request() {
  return new Request('https://admin.example.com/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'signed' },
    body: '{}',
  });
}

describe('Stripe invoice webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCustomInvoiceStatus.mockResolvedValue({});
    findInvoiceById.mockResolvedValue({ status: 'pending' });
    updateStripeStatus.mockResolvedValue({});
  });

  it('marks the linked custom invoice paid', async () => {
    verifyWebhookSignature.mockReturnValue({
      type: 'invoice.paid',
      data: {
        object: {
          status: 'paid',
          metadata: {
            kind: 'custom_invoice',
            customID: 'CO-123',
            invoiceID: 'cinv-123',
          },
        },
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(setCustomInvoiceStatus).toHaveBeenCalledWith('CO-123', 'cinv-123', 'paid', 'stripe');
    expect(updateStripeStatus).toHaveBeenCalledWith('cinv-123', 'paid');
  });

  it('returns 500 so Stripe retries a failed payment update', async () => {
    verifyWebhookSignature.mockReturnValue({
      type: 'invoice.paid',
      data: {
        object: {
          status: 'paid',
          metadata: {
            kind: 'custom_invoice',
            customID: 'CO-123',
            invoiceID: 'cinv-123',
          },
        },
      },
    });
    setCustomInvoiceStatus.mockRejectedValue(new Error('database unavailable'));

    const response = await POST(request());

    expect(response.status).toBe(500);
  });

  it('cancels an unpaid internal invoice when Stripe voids it', async () => {
    verifyWebhookSignature.mockReturnValue({
      type: 'invoice.voided',
      data: {
        object: {
          status: 'void',
          metadata: {
            kind: 'custom_invoice',
            customID: 'CO-123',
            invoiceID: 'cinv-123',
          },
        },
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(setCustomInvoiceStatus).toHaveBeenCalledWith('CO-123', 'cinv-123', 'cancelled', 'stripe');
    expect(updateStripeStatus).toHaveBeenCalledWith('cinv-123', 'void');
  });

  it('preserves a paid internal invoice when Stripe voids it', async () => {
    findInvoiceById.mockResolvedValue({ status: 'paid' });
    verifyWebhookSignature.mockReturnValue({
      type: 'invoice.voided',
      data: {
        object: {
          status: 'void',
          metadata: {
            kind: 'custom_invoice',
            customID: 'CO-123',
            invoiceID: 'cinv-123',
          },
        },
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(setCustomInvoiceStatus).not.toHaveBeenCalled();
    expect(updateStripeStatus).toHaveBeenCalledWith('cinv-123', 'void');
  });
});
