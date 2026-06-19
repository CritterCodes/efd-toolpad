/**
 * Stripe for custom-order invoices — hosted Checkout + webhook verification.
 *
 * No Stripe SDK in the app, so we hit the REST API directly (same pattern as
 * repair-invoices/stripe.js) and verify webhook signatures with HMAC-SHA256.
 * Requires STRIPE_SECRET_KEY (charging) and STRIPE_WEBHOOK_SECRET (verification);
 * callers surface a clear error when unset rather than charging silently.
 */
import crypto from 'crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const e = new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    e.code = 'STRIPE_NOT_CONFIGURED';
    throw e;
  }
  return key;
}

/**
 * Create a one-time hosted Checkout Session for an invoice. The session URL is the
 * link emailed to the client. invoiceID/customID ride in metadata so the webhook
 * can mark the right invoice paid.
 */
export async function createCheckoutSession({
  amountInCents, invoiceID, customID, customerEmail, description, successUrl, cancelUrl,
}) {
  const cents = Math.round(Number(amountInCents) || 0);
  if (cents <= 0) { const e = new Error('Invoice amount must be greater than zero.'); e.code = 'BAD_REQUEST'; throw e; }

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  if (customerEmail) body.set('customer_email', customerEmail);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(cents));
  body.set('line_items[0][price_data][product_data][name]', description || `Custom order ${customID}`);
  body.set('metadata[kind]', 'custom_invoice');
  body.set('metadata[invoiceID]', invoiceID);
  body.set('metadata[customID]', customID);
  // Mirror onto the PaymentIntent so the charge itself is traceable.
  body.set('payment_intent_data[metadata][invoiceID]', invoiceID);
  body.set('payment_intent_data[metadata][customID]', customID);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Failed to create Stripe Checkout session.');
  return { id: data.id, url: data.url };
}

/**
 * Verify a Stripe webhook signature (the `stripe-signature` header) against the
 * raw request body and return the parsed event. Throws on any mismatch.
 */
export function verifyWebhookSignature(rawBody, signatureHeader, { toleranceSeconds = 300 } = {}) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { const e = new Error('Stripe webhook is not configured (STRIPE_WEBHOOK_SECRET missing).'); e.code = 'STRIPE_NOT_CONFIGURED'; throw e; }

  const parts = String(signatureHeader || '').split(',').reduce((acc, kv) => {
    const idx = kv.indexOf('=');
    if (idx > 0) {
      const k = kv.slice(0, idx).trim();
      const v = kv.slice(idx + 1).trim();
      (acc[k] = acc[k] || []).push(v);
    }
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) throw new Error('Invalid Stripe signature header.');

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected);
  const matched = signatures.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
  if (!matched) throw new Error('Stripe signature verification failed.');

  // Replay protection: reject events outside the tolerance window.
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isFinite(age) && age > toleranceSeconds) throw new Error('Stripe webhook timestamp outside tolerance.');

  return JSON.parse(rawBody);
}
