import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * COMBINED INVOICES — Kate Engel has two custom orders in (a woman's band and a men's band, one
 * client). She should get ONE invoice and swipe ONCE, and each order must still be credited exactly
 * what it was billed, because each advances to production at 50% paid and spawns its own work orders.
 */

const ORDERS = {
  'CO-A': { customID: 'CO-A', clientID: 'user-kate', customerEmail: 'kate@gmail.com', title: "Woman's band",
            quote: { quotePublished: true, total: 1000, quoteTotal: 913.24, taxRate: 0.095 } },
  'CO-B': { customID: 'CO-B', clientID: 'user-kate', customerEmail: 'kate@gmail.com', title: "Men's band",
            quote: { quotePublished: true, total: 2000, quoteTotal: 1826.48, taxRate: 0.095 } },
  'CO-OTHER': { customID: 'CO-OTHER', clientID: 'user-seth', customerEmail: 'seth@gmail.com',
                quote: { quotePublished: true, total: 500, taxRate: 0.095 } },
  'CO-DRAFT': { customID: 'CO-DRAFT', clientID: 'user-kate', customerEmail: 'kate@gmail.com',
                quote: { quotePublished: false, total: 500 } },
};

let created;
vi.mock('@/app/api/custom-orders/model', () => ({
  default: { findById: vi.fn(async (id) => ORDERS[id] || null) },
  CUSTOM_ORDER_STATUS: { DEPOSIT: 'deposit', IN_PRODUCTION: 'in_production' },
}));
vi.mock('@/app/api/custom-orders/invoices/model', () => ({
  default: {
    create: vi.fn(async (d) => { created = { ...d, invoiceID: 'cinv-new', invoiceNumber: 'INV-NEW' }; return created; }),
    listByCustom: vi.fn(async () => []),
    findById: vi.fn(async () => null),
  },
  CUSTOM_INVOICE_STATUS: { PENDING: 'pending_payment', PAID: 'paid', CANCELLED: 'cancelled' },
  CUSTOM_INVOICE_TYPE: { DEPOSIT: 'deposit', PROGRESS: 'progress', FINAL: 'final', PARTIAL: 'partial' },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn(async () => ({})) },
  NOTIFICATION_TYPES: { INVOICE_CREATED: 'invoice-created', PAYMENT_RECEIVED: 'payment-received', PAYMENT_THRESHOLD_REACHED: 'x' },
}));
vi.mock('@/lib/appUrls', () => ({ shopBase: () => 'https://shop.test', adminBase: () => 'https://admin.test' }));

const load = async () => (await import('@/services/customs/customInvoices.service')).createCombinedInvoice;

beforeEach(() => { created = undefined; vi.clearAllMocks(); vi.resetModules(); });

describe('createCombinedInvoice', () => {
  it('bills both orders on one invoice with an explicit per-order split', async () => {
    const create = await load();
    const { invoice } = await create(['CO-A', 'CO-B'], { depositPct: 50 });

    expect(invoice.customIDs).toEqual(['CO-A', 'CO-B']);
    expect(invoice.orderSnapshots.map((s) => s.customID)).toEqual(['CO-A', 'CO-B']);
    // 50% deposit of each order's own tax-inclusive total.
    expect(invoice.orderSnapshots.find((s) => s.customID === 'CO-A').amount).toBe(500);
    expect(invoice.orderSnapshots.find((s) => s.customID === 'CO-B').amount).toBe(1000);
  });

  it('the invoice total is the sum of the per-order amounts — one payment, one swipe', async () => {
    const create = await load();
    const { invoice } = await create(['CO-A', 'CO-B'], { depositPct: 50 });
    expect(invoice.amount).toBe(1500);
    expect(invoice.orderSnapshots.reduce((s, x) => s + x.amount, 0)).toBe(invoice.amount);
  });

  it('keeps a primary customID so every existing query and document path still resolves', async () => {
    const create = await load();
    const { invoice } = await create(['CO-A', 'CO-B'], { depositPct: 50 });
    expect(invoice.customID).toBe('CO-A');
  });

  it('honours explicit per-order amounts over the computed deposit', async () => {
    const create = await load();
    const { invoice } = await create(['CO-A', 'CO-B'], { amounts: { 'CO-A': 100, 'CO-B': 250 } });
    expect(invoice.orderSnapshots.map((s) => s.amount)).toEqual([100, 250]);
    expect(invoice.amount).toBe(350);
  });

  it('REFUSES to bill two different clients on one invoice', async () => {
    // One invoice is emailed to one person and paid by one person; this would charge somebody for a
    // stranger's ring.
    const create = await load();
    await expect(create(['CO-A', 'CO-OTHER'], { depositPct: 50 })).rejects.toThrow(/different clients/i);
  });

  it('refuses when any order has no published quote', async () => {
    const create = await load();
    await expect(create(['CO-A', 'CO-DRAFT'], { depositPct: 50 })).rejects.toThrow(/Publish the quote first.*CO-DRAFT/);
  });

  it('refuses fewer than two orders — that is just an ordinary invoice', async () => {
    const create = await load();
    await expect(create(['CO-A'], {})).rejects.toThrow(/at least two orders/);
  });

  it('refuses an order that does not exist, naming it', async () => {
    const create = await load();
    await expect(create(['CO-A', 'CO-GHOST'], { depositPct: 50 })).rejects.toThrow(/not found: CO-GHOST/);
  });

  it('carries a snapshot description per order so the document can list them', async () => {
    const create = await load();
    const { invoice } = await create(['CO-A', 'CO-B'], { depositPct: 50 });
    expect(invoice.orderSnapshots.map((s) => s.description)).toEqual(["Woman's band", "Men's band"]);
  });

  it('deduplicates a repeated order rather than billing it twice', async () => {
    const create = await load();
    await expect(create(['CO-A', 'CO-A'], { depositPct: 50 })).rejects.toThrow(/at least two orders/);
  });
});
