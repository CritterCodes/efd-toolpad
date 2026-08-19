import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The shop webhook writes the paid invoice itself and queues `customPaymentCredits`
 * for admin. This drain is the consumer; what these tests pin down is the queue
 * contract: claim-first idempotency (two drains never double-send a receipt), the
 * threshold advance runs off the REAL ledger, a missing order marks the credit
 * processed instead of wedging the queue, and a side-effect failure RELEASES the
 * claim so the cron retries rather than losing the credit.
 */

let credits;
let order;
let progress;
const creditUpdates = [];
const advances = [];
const receipts = [];
const notifications = [];
let receiptImpl;

const col = {
  find: vi.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => credits.filter((c) => c.status === 'applied' && c.invoiceID && !c.processedAt) }) }) })),
  updateOne: vi.fn(async (filter, update) => {
    creditUpdates.push({ filter, update });
    const credit = credits.find((c) => c._id === filter._id);
    if (!credit) return { modifiedCount: 0 };
    // Mirror the first-wins claim: refuse when the filter demands unprocessed and it is not.
    if (filter.processedAt && credit.processedAt) return { modifiedCount: 0 };
    Object.assign(credit, update.$set || {});
    for (const k of Object.keys(update.$unset || {})) delete credit[k];
    return { modifiedCount: 1 };
  }),
};

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => col })) } }));
vi.mock('@/app/api/custom-orders/model', () => ({
  CUSTOM_ORDER_STATUS: { DEPOSIT: 'deposit', IN_PRODUCTION: 'in_production' },
  default: { findById: vi.fn(async () => order) },
}));
vi.mock('@/services/customs/customInvoices.service', () => ({
  getCustomPaymentProgress: vi.fn(async () => ({ progress })),
}));
vi.mock('@/services/customs/customStatus', () => ({
  advanceCustomOrderStatus: vi.fn(async (id, target, opts) => { advances.push({ id, target, opts }); return { advanced: true }; }),
}));
vi.mock('@/services/customs/customInvoiceDelivery', () => ({
  sendCustomReceiptEmail: vi.fn(async (...a) => { receipts.push(a); return receiptImpl(); }),
}));
vi.mock('@/lib/notificationService', () => ({
  NOTIFICATION_TYPES: { PAYMENT_RECEIVED: 'payment-received' },
  NotificationService: { createNotification: vi.fn(async (n) => { notifications.push(n); }) },
}));
vi.mock('@/lib/appUrls', () => ({ portalLink: (id) => `https://shop.test/${id}` }));

const { drainShopPaymentCredits } = await import('@/services/customs/shopPaymentCredits');

beforeEach(() => {
  creditUpdates.length = 0; advances.length = 0; receipts.length = 0; notifications.length = 0;
  receiptImpl = () => ({ delivery: { sent: true } });
  order = { customID: 'CO-1', clientID: 'client-1', title: 'Signet ring' };
  progress = { paymentProgress: 12.5, hasReached50: false };
  credits = [{ _id: 'c1', creditID: 'cr-1', customID: 'CO-1', invoiceID: 'cinv-shop-1', amount: 10, status: 'applied' }];
});

describe('drainShopPaymentCredits', () => {
  it('advances at the right threshold, notifies, sends the receipt, and marks processed', async () => {
    const r = await drainShopPaymentCredits();
    expect(r).toEqual({ scanned: 1, processed: 1, failed: 0 });
    expect(advances).toEqual([{ id: 'CO-1', target: 'deposit', opts: { reason: 'shop payment 12.5%' } }]);
    expect(receipts).toEqual([['CO-1', 'cinv-shop-1']]);
    expect(notifications).toHaveLength(1);
    expect(credits[0].status).toBe('processed');
    expect(credits[0].receipt).toEqual({ sent: true });
  });

  it('targets in_production once the ledger crosses 50%', async () => {
    progress = { paymentProgress: 62, hasReached50: true };
    await drainShopPaymentCredits();
    expect(advances[0].target).toBe('in_production');
  });

  it('a credit already claimed by a concurrent drain is skipped (no double receipt)', async () => {
    credits[0].processedAt = new Date(); // someone else claimed between find and claim
    const r = await drainShopPaymentCredits();
    expect(r.processed).toBe(0);
    expect(receipts).toHaveLength(0);
  });

  it('a missing order marks the credit processed with a note instead of wedging the queue', async () => {
    order = null;
    const r = await drainShopPaymentCredits();
    expect(r.processed).toBe(1);
    expect(credits[0].note).toMatch(/not found/);
    expect(receipts).toHaveLength(0);
  });

  it('releases the claim on failure so the cron retries, and records the error', async () => {
    const { getCustomPaymentProgress } = await import('@/services/customs/customInvoices.service');
    getCustomPaymentProgress.mockRejectedValueOnce(new Error('mongo down'));
    const r = await drainShopPaymentCredits();
    expect(r).toEqual({ scanned: 1, processed: 0, failed: 1 });
    expect(credits[0].status).toBe('applied');
    expect(credits[0].processedAt).toBeUndefined();
    expect(credits[0].lastError).toBe('mongo down');
  });

  it('a failed receipt send does NOT release the claim — it is recorded to chase, not retried blind', async () => {
    receiptImpl = () => ({ delivery: { sent: false, error: 'smtp down' } });
    const r = await drainShopPaymentCredits();
    expect(r.processed).toBe(1);
    expect(credits[0].status).toBe('processed');
    expect(credits[0].receipt).toEqual({ sent: false, error: 'smtp down' });
  });
});
