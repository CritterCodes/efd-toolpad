/**
 * Online payment for wholesale invoices (owner ruling, 2026-09-01):
 * ACH is the default rail and the shop eats its fee (~0.8% capped — cheap enough
 * to absorb on trade volume); cards are the convenience option and the ~2.9% +
 * 30¢ is SURCHARGED, itemized on the Stripe Checkout page as its own line.
 *
 * Uses Stripe Checkout (hosted page) on purpose: no card data or bank flows in
 * our UI, no client-side Stripe SDK dependency, and ACH bank-connect handled by
 * Stripe end to end. The webhook records the money using the SAME shape the POS
 * writes (payments[] + computePaymentStatus + syncPaidRepairs), so closeout and
 * reporting cannot tell an online payment from a counter payment.
 */
import { db } from '@/lib/database';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';

export const CARD_FEE_RATE = 0.029;
export const CARD_FEE_FLAT = 0.30;

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/** The surcharge a card payment adds. ACH carries none — the shop eats it. */
export function cardConvenienceFee(base) {
  return round2(Number(base) * CARD_FEE_RATE + CARD_FEE_FLAT);
}

/**
 * May this session pay this invoice? Staff always; a wholesaler only when the
 * invoice is theirs — same identity rule as the Billing list (clientID/storeId
 * by userID, or the business account key, since admin-created wholesale repairs
 * carry the business identity rather than the wholesaler's id).
 */
export async function invoiceBelongsToSession(session, invoice) {
  const role = session?.user?.role;
  if (['admin', 'dev'].includes(role)) return true;
  if (role !== 'wholesaler') return false;
  const userID = session.user.userID;
  if (!userID) return false;
  if (invoice.clientID === userID || invoice.storeId === userID) return true;

  const dbi = await db.connect();
  const me = await dbi.collection('users').findOne(
    { userID },
    { projection: { _id: 0, business: 1, 'wholesaleApplication.businessName': 1 } },
  );
  const accountIds = [...new Set(
    [me?.business, me?.wholesaleApplication?.businessName]
      .map(normalizeAccountKey)
      .filter(Boolean)
      .map((key) => `wholesale-business:${key}`),
  )];
  return accountIds.includes(invoice.accountID);
}

/**
 * Create the Stripe Checkout Session for an invoice's remaining balance.
 * @returns {{ url: string, sessionId: string, base: number, fee: number }}
 */
export async function createInvoiceCheckoutSession({ invoice, method, successUrl, cancelUrl }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured.');

  const base = round2(invoice.remainingBalance);
  const fee = method === 'card' ? cardConvenienceFee(base) : 0;

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.append('payment_method_types[]', method === 'card' ? 'card' : 'us_bank_account');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', invoice.invoiceID);

  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(Math.round(base * 100)));
  body.set('line_items[0][price_data][product_data][name]', `Repair invoice ${invoice.invoiceID}`);
  if (fee > 0) {
    // The surcharge is its OWN line so the disclosure is on the payment page
    // itself, not buried in a total.
    body.set('line_items[1][quantity]', '1');
    body.set('line_items[1][price_data][currency]', 'usd');
    body.set('line_items[1][price_data][unit_amount]', String(Math.round(fee * 100)));
    body.set('line_items[1][price_data][product_data][name]', 'Card convenience fee (2.9% + 30¢)');
  }

  const metadata = {
    kind: 'wholesale_invoice',
    invoiceID: invoice.invoiceID,
    method,
    baseAmount: String(base),
    feeAmount: String(fee),
  };
  for (const [k, v] of Object.entries(metadata)) {
    body.set(`metadata[${k}]`, v);
    body.set(`payment_intent_data[metadata][${k}]`, v);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Failed to create the Stripe Checkout session.');

  return { url: data.url, sessionId: data.id, base, fee };
}

/**
 * Record a settled Checkout payment on the invoice — the webhook's sink.
 * Idempotent by Stripe session id: Stripe retries webhooks, and a replay must
 * not pay an invoice twice. The amount recorded toward the invoice is the BASE
 * (what the invoice is owed); the card surcharge rides along as processingFee,
 * exactly how the POS card path records fees.
 */
export async function recordWholesaleCheckoutPayment(checkoutSession) {
  const meta = checkoutSession?.metadata || {};
  if (meta.kind !== 'wholesale_invoice' || !meta.invoiceID) return { recorded: false, reason: 'not a wholesale invoice session' };

  const { default: RepairInvoicesModel } = await import('@/app/api/repair-invoices/model');
  const { computePaymentStatus, syncPaidRepairs } = await import('@/app/api/repair-invoices/service');

  const invoice = await RepairInvoicesModel.findByInvoiceID(meta.invoiceID);
  if (!invoice) return { recorded: false, reason: `invoice ${meta.invoiceID} not found` };

  const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
  if (payments.some((p) => p.stripeSessionId === checkoutSession.id)) {
    return { recorded: false, reason: 'already recorded (webhook replay)' };
  }

  const base = round2(meta.baseAmount);
  const fee = round2(meta.feeAmount);
  payments.push({
    type: meta.method === 'card' ? 'credit_card' : 'ach',
    amount: base,
    baseAmount: base,
    processingFee: fee,
    receivedAt: new Date(),
    receivedBy: 'stripe-checkout',
    notes: meta.method === 'card'
      ? `Paid online by card (convenience fee $${fee.toFixed(2)} collected separately).`
      : 'Paid online by ACH bank debit.',
    status: 'completed',
    source: 'wholesale_portal_checkout',
    stripeSessionId: checkoutSession.id,
    stripePaymentIntentId: checkoutSession.payment_intent || null,
  });

  const amountPaid = round2(payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const { paymentStatus, remainingBalance } = computePaymentStatus(invoice.total, amountPaid);

  await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    payments,
    amountPaid,
    paymentStatus,
    remainingBalance,
    ...(paymentStatus === 'paid' ? { status: 'paid', paidAt: new Date() } : {}),
  });
  if (paymentStatus === 'paid') {
    await syncPaidRepairs(invoice).catch((e) => console.error('syncPaidRepairs failed:', e?.message));
  }

  return { recorded: true, invoiceID: invoice.invoiceID, amount: base, paymentStatus };
}
