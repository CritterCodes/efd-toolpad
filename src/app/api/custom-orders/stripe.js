/**
 * Stripe helpers for custom-order invoices.
 *
 * Custom billing uses Stripe's hosted Invoice flow rather than a generic Checkout
 * Session so Stripe owns delivery, the hosted payment page, PDF generation, and
 * invoice status. The internal customInvoices record remains the app's source of
 * truth and is linked through metadata.
 */
import crypto from 'crypto';

const STRIPE_API = 'https://api.stripe.com/v1';
const STRIPE_VERSION = process.env.STRIPE_API_VERSION || '2026-06-24.dahlia';

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const error = new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  const live = key.startsWith('sk_live_') || key.startsWith('rk_live_');
  if (process.env.VERCEL_ENV === 'production' && !live) {
    const error = new Error('Live Stripe billing is not configured for Production.');
    error.code = 'STRIPE_LIVE_REQUIRED';
    throw error;
  }
  return { key, live };
}

async function stripeRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const { key, live } = stripeKey();
  const headers = {
    Authorization: `Bearer ${key}`,
    'Stripe-Version': STRIPE_VERSION,
  };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    ...(body ? { body: body.toString() } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Stripe request failed.');
    error.code = 'STRIPE_REQUEST_FAILED';
    error.stripeType = data?.error?.type || null;
    throw error;
  }
  return { data, live };
}

function metadata(body, values) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') {
      body.set(`metadata[${key}]`, String(value));
    }
  }
}

async function findOrCreateCustomer({ email, name, customID, invoiceID }) {
  const query = new URLSearchParams({ email, limit: '1' });
  const listed = await stripeRequest(`/customers?${query.toString()}`);
  const existing = listed.data?.data?.find(
    (customer) => String(customer.email || '').toLowerCase() === email.toLowerCase(),
  );
  if (existing) return existing;

  const body = new URLSearchParams({ email });
  if (name) body.set('name', name);
  metadata(body, { source: 'efd-custom-order', customID });
  const created = await stripeRequest('/customers', {
    method: 'POST',
    body,
    idempotencyKey: `custom-invoice-${invoiceID}-customer`,
  });
  return created.data;
}

/** Create, finalize, and email a one-off hosted Stripe invoice. */
export async function createAndSendStripeInvoice({
  invoiceID,
  invoiceNumber,
  customID,
  amountInCents,
  customerEmail,
  customerName,
  description,
  dueDays = 7,
}) {
  const cents = Math.round(Number(amountInCents) || 0);
  if (cents <= 0) {
    const error = new Error('Invoice amount must be greater than zero.');
    error.code = 'BAD_REQUEST';
    throw error;
  }

  const customer = await findOrCreateCustomer({
    email: customerEmail,
    name: customerName,
    customID,
    invoiceID,
  });

  const invoiceBody = new URLSearchParams({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: String(Math.max(1, Math.min(90, Number(dueDays) || 7))),
    auto_advance: 'false',
    description: description || `Custom order ${customID}`,
    footer: 'Thank you for choosing Engel Fine Design.',
  });
  invoiceBody.set('custom_fields[0][name]', 'Project');
  invoiceBody.set('custom_fields[0][value]', customID);
  metadata(invoiceBody, {
    kind: 'custom_invoice',
    invoiceID,
    invoiceNumber,
    customID,
  });
  const created = await stripeRequest('/invoices', {
    method: 'POST',
    body: invoiceBody,
    idempotencyKey: `custom-invoice-${invoiceID}-invoice`,
  });

  const itemBody = new URLSearchParams({
    customer: customer.id,
    invoice: created.data.id,
    amount: String(cents),
    currency: 'usd',
    description: description || `Custom order ${customID}`,
  });
  metadata(itemBody, { kind: 'custom_invoice', invoiceID, customID });
  await stripeRequest('/invoiceitems', {
    method: 'POST',
    body: itemBody,
    idempotencyKey: `custom-invoice-${invoiceID}-item`,
  });

  const finalized = await stripeRequest(`/invoices/${created.data.id}/finalize`, {
    method: 'POST',
    body: new URLSearchParams(),
    idempotencyKey: `custom-invoice-${invoiceID}-finalize`,
  });
  const sent = await stripeRequest(`/invoices/${created.data.id}/send`, {
    method: 'POST',
    body: new URLSearchParams(),
    idempotencyKey: `custom-invoice-${invoiceID}-send-1`,
  });

  return {
    id: sent.data.id,
    customerID: customer.id,
    hostedInvoiceUrl: sent.data.hosted_invoice_url || finalized.data.hosted_invoice_url,
    invoicePdf: sent.data.invoice_pdf || finalized.data.invoice_pdf || null,
    status: sent.data.status,
    number: sent.data.number || finalized.data.number || null,
    livemode: Boolean(sent.data.livemode ?? created.live),
  };
}

/** Re-email an existing open Stripe invoice without creating another invoice. */
export async function resendStripeInvoice(stripeInvoiceID, invoiceID, sendAttempt) {
  const sent = await stripeRequest(`/invoices/${stripeInvoiceID}/send`, {
    method: 'POST',
    body: new URLSearchParams(),
    idempotencyKey: `custom-invoice-${invoiceID}-send-${sendAttempt}`,
  });
  return {
    id: sent.data.id,
    hostedInvoiceUrl: sent.data.hosted_invoice_url,
    invoicePdf: sent.data.invoice_pdf || null,
    status: sent.data.status,
    number: sent.data.number || null,
    livemode: Boolean(sent.data.livemode ?? sent.live),
  };
}

/**
 * Verify a Stripe webhook signature against the raw request body.
 */
export function verifyWebhookSignature(rawBody, signatureHeader, { toleranceSeconds = 300 } = {}) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error('Stripe webhook is not configured (STRIPE_WEBHOOK_SECRET missing).');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  const parts = String(signatureHeader || '').split(',').reduce((acc, pair) => {
    const index = pair.indexOf('=');
    if (index > 0) {
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      (acc[key] = acc[key] || []).push(value);
    }
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) throw new Error('Invalid Stripe signature header.');

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const matched = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature);
    return signatureBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  });
  if (!matched) throw new Error('Stripe signature verification failed.');

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isFinite(age) && Math.abs(age) > toleranceSeconds) {
    throw new Error('Stripe webhook timestamp outside tolerance.');
  }
  return JSON.parse(rawBody);
}
