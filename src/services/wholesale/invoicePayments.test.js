import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Online wholesale payments. The properties that protect real money:
 *   - the card surcharge is exactly the disclosed formula; ACH carries none
 *   - a wholesaler can only start payment on THEIR invoice
 *   - the webhook sink is idempotent by Stripe session id (Stripe retries)
 *   - the invoice is credited the BASE amount; the surcharge never inflates
 *     amountPaid (it would mark the invoice overpaid)
 */

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  findByInvoiceID: vi.fn(),
  updateByInvoiceID: vi.fn(async () => ({})),
  syncPaidRepairs: vi.fn(async () => ({})),
  fetch: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: mocks.userFindOne }) })) },
}));
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: { findByInvoiceID: mocks.findByInvoiceID, updateByInvoiceID: mocks.updateByInvoiceID },
}));
vi.mock('@/app/api/repair-invoices/service', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, syncPaidRepairs: mocks.syncPaidRepairs };
});

const {
  cardConvenienceFee,
  invoiceBelongsToSession,
  createInvoiceCheckoutSession,
  recordWholesaleCheckoutPayment,
} = await import('./invoicePayments');

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mocks.fetch;
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
});

describe('cardConvenienceFee', () => {
  it('is exactly the disclosed 2.9% + 30¢', () => {
    expect(cardConvenienceFee(100)).toBe(3.2);
    expect(cardConvenienceFee(500)).toBe(14.8);
  });
});

describe('invoiceBelongsToSession', () => {
  const marlen = { user: { role: 'wholesaler', userID: 'ws-marlen' } };

  it('matches by clientID or storeId without a user lookup', async () => {
    expect(await invoiceBelongsToSession(marlen, { clientID: 'ws-marlen' })).toBe(true);
    expect(await invoiceBelongsToSession(marlen, { storeId: 'ws-marlen' })).toBe(true);
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('falls back to the business account key', async () => {
    mocks.userFindOne.mockResolvedValue({ business: 'Marlen Jewelers' });
    expect(await invoiceBelongsToSession(marlen, { clientID: 'someone-else', accountID: 'wholesale-business:marlen-jewelers' })).toBe(true);
  });

  it("REFUSES another wholesaler's invoice", async () => {
    mocks.userFindOne.mockResolvedValue({ business: 'Marlen Jewelers' });
    expect(await invoiceBelongsToSession(marlen, { clientID: 'ws-rocky', accountID: 'wholesale-business:rocky-s-corner' })).toBe(false);
  });

  it('staff always may; other roles never', async () => {
    expect(await invoiceBelongsToSession({ user: { role: 'admin' } }, {})).toBe(true);
    expect(await invoiceBelongsToSession({ user: { role: 'artisan', userID: 'a1' } }, { clientID: 'a1' })).toBe(false);
  });
});

describe('createInvoiceCheckoutSession', () => {
  const invoice = { invoiceID: 'rinv-1', remainingBalance: 500 };
  const stubStripe = () => mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'cs_1', client_secret: 'cs_1_secret' }) });

  it('ACH: charges exactly the balance, one line, us_bank_account, EMBEDDED', async () => {
    stubStripe();
    const out = await createInvoiceCheckoutSession({ invoice, method: 'ach', successUrl: 's', cancelUrl: 'c' });
    expect(out).toMatchObject({ base: 500, fee: 0, clientSecret: 'cs_1_secret' });
    const body = mocks.fetch.mock.calls[0][1].body;
    expect(body).toContain('ui_mode=embedded');
    expect(body).toContain('return_url=s');
    expect(body).toContain('payment_method_types%5B%5D=us_bank_account');
    expect(body).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=50000');
    expect(body).not.toContain('line_items%5B1%5D'); // no fee line
  });

  it('card: the surcharge is its OWN disclosed line item', async () => {
    stubStripe();
    const out = await createInvoiceCheckoutSession({ invoice, method: 'card', successUrl: 's', cancelUrl: 'c' });
    expect(out.fee).toBe(14.8);
    const body = mocks.fetch.mock.calls[0][1].body;
    expect(body).toContain('payment_method_types%5B%5D=card');
    expect(body).toContain('line_items%5B1%5D%5Bprice_data%5D%5Bunit_amount%5D=1480');
    // the sink needs these to credit base, not base+fee
    expect(body).toContain('metadata%5BbaseAmount%5D=500');
    expect(body).toContain('metadata%5BfeeAmount%5D=14.8');
  });
});

describe('recordWholesaleCheckoutPayment (the webhook sink)', () => {
  const session = (over = {}) => ({
    id: 'cs_1',
    payment_intent: 'pi_1',
    metadata: { kind: 'wholesale_invoice', invoiceID: 'rinv-1', method: 'card', baseAmount: '500', feeAmount: '14.8' },
    ...over,
  });

  it('credits the BASE toward the invoice; the surcharge rides as processingFee', async () => {
    mocks.findByInvoiceID.mockResolvedValue({ invoiceID: 'rinv-1', total: 500, payments: [] });
    const out = await recordWholesaleCheckoutPayment(session());
    expect(out).toMatchObject({ recorded: true, amount: 500, paymentStatus: 'paid' });

    const update = mocks.updateByInvoiceID.mock.calls[0][1];
    expect(update.amountPaid).toBe(500);           // NOT 514.80
    expect(update.paymentStatus).toBe('paid');
    expect(update.payments[0]).toMatchObject({ amount: 500, processingFee: 14.8, stripeSessionId: 'cs_1' });
    expect(update.pendingCheckout).toBeNull();     // the in-flight marker clears with settlement
    expect(mocks.syncPaidRepairs).toHaveBeenCalled();
  });

  it('marks an ACH session PROCESSING so Billing stops offering Pay', async () => {
    const { markWholesalePaymentProcessing, clearWholesalePaymentProcessing } = await import('./invoicePayments');
    await markWholesalePaymentProcessing(session({ payment_status: 'unpaid' }));
    const update = mocks.updateByInvoiceID.mock.calls[0][1];
    expect(update.pendingCheckout).toMatchObject({ sessionId: 'cs_1', method: 'card', amount: 500 });

    await clearWholesalePaymentProcessing('rinv-1');
    expect(mocks.updateByInvoiceID.mock.calls[1][1]).toEqual({ pendingCheckout: null });
  });

  it('a webhook REPLAY records nothing (idempotent by session id)', async () => {
    mocks.findByInvoiceID.mockResolvedValue({
      invoiceID: 'rinv-1', total: 500,
      payments: [{ stripeSessionId: 'cs_1', amount: 500, status: 'completed' }],
    });
    const out = await recordWholesaleCheckoutPayment(session());
    expect(out.recorded).toBe(false);
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalled();
  });

  it('a partial payment leaves the invoice open with the right balance', async () => {
    mocks.findByInvoiceID.mockResolvedValue({ invoiceID: 'rinv-1', total: 800, payments: [] });
    const out = await recordWholesaleCheckoutPayment(session());
    expect(out.paymentStatus).not.toBe('paid');
    const update = mocks.updateByInvoiceID.mock.calls[0][1];
    expect(update.remainingBalance).toBe(300);
    expect(update.paidAt).toBeUndefined();
    expect(mocks.syncPaidRepairs).not.toHaveBeenCalled();
  });

  it('ignores sessions that are not wholesale invoices', async () => {
    const out = await recordWholesaleCheckoutPayment({ id: 'cs_x', metadata: { kind: 'custom_invoice' } });
    expect(out.recorded).toBe(false);
    expect(mocks.findByInvoiceID).not.toHaveBeenCalled();
  });
});
