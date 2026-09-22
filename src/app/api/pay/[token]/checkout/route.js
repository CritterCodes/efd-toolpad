/**
 * POST /api/pay/[token]/checkout — a retail customer starts a card payment for their invoice from the
 * PUBLIC page /pay/[token]. Unauthenticated by design: the token is the credential (24 random bytes,
 * stamped by services/repairs/readyForPickup.js). Creates a HOSTED Stripe Checkout session and 303s
 * the browser to it; the invoice is marked paid only by the Stripe webhook.
 *
 * Card only (a walk-in customer paying ahead), with the same disclosed convenience fee the POS and
 * the wholesale portal itemize. A 404 for a bad token — never confirm what exists.
 */
import { NextResponse } from 'next/server';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { adminLink } from '@/lib/appUrls';
import { createInvoiceCheckoutSession, PAYABLE_INVOICE_KINDS } from '@/services/wholesale/invoicePayments';

export const dynamic = 'force-dynamic';

function back(token, query) {
  return NextResponse.redirect(adminLink(`/pay/${encodeURIComponent(token)}?${query}`), 303);
}

export async function POST(_req, { params }) {
  const { token } = await params;
  const safe = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(safe)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const invoice = await RepairInvoicesModel.findAll({ payToken: safe }).then((r) => (Array.isArray(r) ? r[0] : null)).catch(() => null);
  if (!invoice || invoice.accountType !== 'retail') return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (invoice.paymentStatus === 'paid' || !(Number(invoice.remainingBalance) > 0) || !['draft', 'open'].includes(invoice.status)) {
    return back(safe, 'status=nothing-due');
  }
  if (invoice.pendingCheckout?.sessionId) return back(safe, 'status=processing');
  if (!process.env.STRIPE_SECRET_KEY) return back(safe, 'error=unavailable');

  try {
    const checkout = await createInvoiceCheckoutSession({
      invoice,
      method: 'card',
      kind: PAYABLE_INVOICE_KINDS.RETAIL,
      uiMode: 'hosted',
      successUrl: adminLink(`/pay/${encodeURIComponent(safe)}?status=paid`),
      cancelUrl: adminLink(`/pay/${encodeURIComponent(safe)}?status=cancel`),
    });
    if (!checkout?.url) return back(safe, 'error=unavailable');
    return NextResponse.redirect(checkout.url, 303);
  } catch (error) {
    console.error('[pay] checkout session failed:', error?.message || error);
    return back(safe, 'error=unavailable');
  }
}
