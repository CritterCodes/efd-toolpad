import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/app/api/custom-orders/stripe';
import { setCustomInvoiceStatus } from '@/services/customs/customInvoices.service';
import { CUSTOM_INVOICE_STATUS } from '@/app/api/custom-orders/invoices/model';

// Stripe must reach the raw body; never cache.
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook — Stripe event sink.
 * On checkout.session.completed for a custom invoice (metadata.kind), mark the
 * invoice paid, which advances the order + fires payment notifications. Returns 200
 * on anything we don't handle so Stripe doesn't retry forever.
 */
export const POST = async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    // Bad signature / not configured → 400 so Stripe flags it (and we don't act).
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const meta = session.metadata || {};
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      if (meta.kind === 'custom_invoice' && meta.customID && meta.invoiceID && paid) {
        await setCustomInvoiceStatus(meta.customID, meta.invoiceID, CUSTOM_INVOICE_STATUS.PAID, 'stripe');
      }
    }
  } catch (error) {
    // Log but still 200 — a processing error shouldn't trigger infinite Stripe retries
    // for an event we've already received; reconcile manually if needed.
    console.error('⚠️ Stripe webhook processing error:', error.message);
  }

  return NextResponse.json({ received: true }, { status: 200 });
};
