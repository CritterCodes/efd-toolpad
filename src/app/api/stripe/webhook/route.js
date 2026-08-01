import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/app/api/custom-orders/stripe';
import { setCustomInvoiceStatus } from '@/services/customs/customInvoices.service';
import CustomInvoicesModel, { CUSTOM_INVOICE_STATUS } from '@/app/api/custom-orders/invoices/model';
import { db as mongo } from '@/lib/database';
import { NotificationService } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

// Stripe must reach the raw body; never cache.
export const dynamic = 'force-dynamic';

/**
 * Metadata `kind` values that belong to the artisan billing rail rather than customs.
 *
 * Listed literally rather than imported from artisanInvoices/model so this route keeps its lazy-import
 * shape (the customs path must not drag the production models in). `artisanKinds.test.js` asserts this
 * equals Object.values(ARTISAN_INVOICE_KIND), so the copy cannot drift silently.
 *
 * ONE list, used by every branch: the paid branch spelled these out inline and the voided branch simply
 * didn't have them, which is exactly how an artisan invoice ended up with a paid path and no void path.
 */
export const ARTISAN_KINDS = Object.freeze(['artisan_wo_invoice', 'casting_charge']);

/**
 * POST /api/stripe/webhook — Stripe event sink.
 * Stripe Invoice events are authoritative for custom-order billing. The legacy
 * Checkout event remains supported for links created before this migration.
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
    if (event.type === 'invoice.paid') {
      const invoice = event.data?.object || {};
      const meta = invoice.metadata || {};
      if (meta.kind === 'custom_invoice' && meta.customID && meta.invoiceID && invoice.status === 'paid') {
        await setCustomInvoiceStatus(meta.customID, meta.invoiceID, CUSTOM_INVOICE_STATUS.PAID, 'stripe');
        await CustomInvoicesModel.updateStripeStatus(meta.invoiceID, invoice.status);
      } else if (ARTISAN_KINDS.includes(meta.kind) && meta.invoiceID && invoice.status === 'paid') {
        // Artisan billing rail (S5): mark the artisan invoice paid → lifts the freeze and clears
        // the linked casting shipping gate. Lazy import to keep the customs webhook path independent.
        const { markArtisanInvoicePaid } = await import('@/services/production/artisanBilling');
        await markArtisanInvoicePaid(meta.invoiceID);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data?.object || {};
      if (invoice.metadata?.kind === 'custom_invoice' && invoice.metadata?.invoiceID) {
        await CustomInvoicesModel.updateStripeStatus(invoice.metadata.invoiceID, 'payment_failed');
      }
    } else if (event.type === 'invoice.voided') {
      const invoice = event.data?.object || {};
      const meta = invoice.metadata || {};
      if (meta.kind === 'custom_invoice' && meta.customID && meta.invoiceID) {
        const internalInvoice = await CustomInvoicesModel.findById(meta.invoiceID);
        if (internalInvoice?.status !== CUSTOM_INVOICE_STATUS.PAID) {
          await setCustomInvoiceStatus(meta.customID, meta.invoiceID, CUSTOM_INVOICE_STATUS.CANCELLED, 'stripe');
        }
        await CustomInvoicesModel.updateStripeStatus(meta.invoiceID, invoice.status || 'void');
      } else if (ARTISAN_KINDS.includes(meta.kind) && meta.invoiceID) {
        // The artisan rail's missing half. `invoice.paid` has routed artisan kinds since S5, but voiding
        // in Stripe left our row at `pending_payment` — so it went overdue at +14 days and FROZE the
        // artisan out of new runs/WOs/listings, with the invoice that caused it already cancelled and
        // unpayable. That is the failure castingSettlement names in its own words: "every exit from an
        // invoiced state must resolve the invoice… Getting this wrong is worse than never billing."
        //
        // Never walks back a PAID invoice: Stripe cannot void a paid invoice, but a late/replayed event
        // must not un-pay one either — and markPaid already cleared the casting shipping gate.
        // Only a PENDING row is voided — not merely "not paid". Stripe replays events, and admitting an
        // already-void row would overwrite voidedAt and replace a deliberate reason ("duplicate — billed
        // in error (a@efd.com)") with the generic one, destroying the audit trail for no gain.
        const { default: ArtisanInvoicesModel, ARTISAN_INVOICE_STATUS } = await import('@/app/api/artisanInvoices/model');
        const existing = await ArtisanInvoicesModel.findById(meta.invoiceID);
        if (existing && existing.status === ARTISAN_INVOICE_STATUS.PENDING) {
          await ArtisanInvoicesModel.markVoid(meta.invoiceID, 'voided in Stripe');
        }
      }
    } else if (event.type === 'invoice.sent' || event.type === 'invoice.finalized') {
      const invoice = event.data?.object || {};
      if (invoice.metadata?.kind === 'custom_invoice' && invoice.metadata?.invoiceID) {
        await CustomInvoicesModel.updateStripeStatus(invoice.metadata.invoiceID, invoice.status || 'open');
      }
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const meta = session.metadata || {};
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      if (meta.kind === 'custom_invoice' && meta.customID && meta.invoiceID && paid) {
        await setCustomInvoiceStatus(meta.customID, meta.invoiceID, CUSTOM_INVOICE_STATUS.PAID, 'stripe');
      }
    }

    // P1 — Stripe Connect account verified. When a connected account flips to
    // charges_enabled/payouts_enabled, tell the owning artisan they're set up for payouts.
    if (event.type === 'account.updated') {
      const account = event.data?.object || {};
      const nowVerified = account.charges_enabled === true || account.payouts_enabled === true;
      if (nowVerified && account.id) {
        // Map the connected account id → artisan user. NOTE: as of this writing no Connect
        // onboarding flow persists the account id on the user doc, so this lookup is best-effort.
        // We probe the field names a future onboarding flow would plausibly use; if none match,
        // we SKIP delivery (rather than guessing a recipient) and log for reconciliation.
        try {
          const db = await mongo.connect();
          const user = await db.collection('users').findOne({
            $or: [
              { stripeConnectAccountId: account.id },
              { stripeAccountId: account.id },
              { 'stripe.connectAccountId': account.id },
              { 'stripe.accountId': account.id },
            ],
          });

          if (user) {
            const artisanUserID = user.userID || user._id?.toString();
            await NotificationService.createNotification({
              userId: artisanUserID,
              type: 'connect-verified',
              title: 'Payouts Enabled',
              message: 'Your Stripe payout account is verified. You can now receive payouts.',
              channels: ['inApp', 'email', 'push'],
              recipientEmail: user.email || '',
              priority: 'high',
              data: {
                actionUrl: `${adminBase()}/dashboard/payroll`,
                relatedType: 'stripe-connect',
                stripeAccountId: account.id,
              },
            });
          } else {
            // SKIPPED: no user maps to this connected account id (no onboarding flow stores it yet).
            console.warn(`ℹ️ P1 connect-verified: no user found for Stripe account ${account.id}; notification SKIPPED.`);
          }
        } catch (notifyError) {
          console.error('⚠️ P1 connect-verified notification failed:', notifyError.message);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Stripe webhook processing error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
};
