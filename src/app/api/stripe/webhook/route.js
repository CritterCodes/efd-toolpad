import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/app/api/custom-orders/stripe';
import { setCustomInvoiceStatus } from '@/services/customs/customInvoices.service';
import { CUSTOM_INVOICE_STATUS } from '@/app/api/custom-orders/invoices/model';
import { db as mongo } from '@/lib/database';
import { NotificationService } from '@/lib/notificationService';

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
                actionUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL || ''}/dashboard/payroll`,
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
    // Log but still 200 — a processing error shouldn't trigger infinite Stripe retries
    // for an event we've already received; reconcile manually if needed.
    console.error('⚠️ Stripe webhook processing error:', error.message);
  }

  return NextResponse.json({ received: true }, { status: 200 });
};
