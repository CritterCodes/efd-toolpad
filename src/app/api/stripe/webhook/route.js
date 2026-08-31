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
      } else if ((meta.kind === 'artisan_wo_invoice' || meta.kind === 'casting_charge') && meta.invoiceID && invoice.status === 'paid') {
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
      } else if (meta.kind === 'wholesale_invoice') {
        if (session.payment_status === 'paid') {
          // Card payments settle inside Checkout, so 'completed' arrives already paid.
          const { recordWholesaleCheckoutPayment } = await import('@/services/wholesale/invoicePayments');
          await recordWholesaleCheckoutPayment(session);
        } else {
          // ACH: the session is complete but the debit takes days. Mark the
          // invoice processing so Billing stops offering Pay on it.
          const { markWholesalePaymentProcessing } = await import('@/services/wholesale/invoicePayments');
          await markWholesalePaymentProcessing(session);
        }
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      // ACH settled days after the session completed — record it now, same sink,
      // idempotent by session id (Stripe retries webhooks).
      const session = event.data?.object || {};
      if (session.metadata?.kind === 'wholesale_invoice') {
        const { recordWholesaleCheckoutPayment } = await import('@/services/wholesale/invoicePayments');
        await recordWholesaleCheckoutPayment(session);
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      // An ACH debit bounced AFTER the wholesaler left thinking they had paid.
      // Silent failure here means the shop ships work against money that never
      // arrived — tell the admins immediately.
      const session = event.data?.object || {};
      const meta = session.metadata || {};
      if (meta.kind === 'wholesale_invoice' && meta.invoiceID) {
        const { clearWholesalePaymentProcessing } = await import('@/services/wholesale/invoicePayments');
        await clearWholesalePaymentProcessing(meta.invoiceID);
        const { notifyAllAdmins } = await import('@/lib/notificationService');
        await notifyAllAdmins({
          type: 'wholesale-payment-failed',
          title: 'Wholesale ACH payment failed',
          message: `The bank debit for invoice ${meta.invoiceID} ($${meta.baseAmount}) failed after checkout. The invoice is still open — follow up with the account.`,
          priority: 'high',
          relatedData: { invoiceID: meta.invoiceID },
        }).catch((e) => console.error('ACH-failure notification failed:', e?.message));
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
