import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import ArtisanInvoicesModel, { ARTISAN_INVOICE_STATUS } from '../../model';
import { pushArtisanInvoiceToStripe } from '@/services/production/artisanBilling';

/**
 * POST /api/artisanInvoices/[invoiceID]/push-to-stripe — turn a ledger row into a hosted Stripe
 * invoice the artisan can actually pay (U-BILL-2).
 *
 * `pushArtisanInvoiceToStripe` has existed since S5 with no caller, which is why staff recorded artisan
 * payment by hand. Once sent, Stripe drives resolution: `invoice.paid` marks it paid here (and clears a
 * linked casting shipping gate), `invoice.voided` marks it void. Both branches of that webhook now
 * handle artisan kinds.
 *
 * Idempotent by intent: an invoice that already carries a `checkoutUrl` returns it rather than minting
 * a second Stripe invoice for the same debt — double-invoicing an artisan is the failure to avoid here,
 * and re-sending is a Stripe-side action.
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const { invoiceID } = await params;
    if (!invoiceID) {
      return NextResponse.json({ error: 'Invoice ID is required.' }, { status: 400 });
    }

    const invoice = await ArtisanInvoicesModel.findById(invoiceID);
    if (!invoice) {
      return NextResponse.json({ error: 'Artisan invoice not found.' }, { status: 404 });
    }
    if (invoice.status !== ARTISAN_INVOICE_STATUS.PENDING) {
      // Sending a payment link for something already settled or cancelled invites a payment nobody
      // can reconcile.
      return NextResponse.json({ error: `Cannot send an invoice that is ${invoice.status}.` }, { status: 409 });
    }
    if (invoice.checkoutUrl) {
      return NextResponse.json(
        { success: true, alreadySent: true, checkoutUrl: invoice.checkoutUrl, stripeInvoiceID: invoice.stripeInvoiceID },
        { status: 200 },
      );
    }

    const stripe = await pushArtisanInvoiceToStripe(invoiceID);
    return NextResponse.json(
      { success: true, alreadySent: false, checkoutUrl: stripe.hostedInvoiceUrl, stripeInvoiceID: stripe.id },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error pushing artisan invoice to Stripe:', error.message);
    // A missing billing email is the caller's problem to fix, not a server fault.
    const status = /billing email/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
};
