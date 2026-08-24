/**
 * Consume the shop's custom-payment queue (`customPaymentCredits`).
 *
 * When a customer pays toward a custom order in the SHOP checkout, the shop webhook
 * writes the paid `customInvoices` record itself (so the payment is visible everywhere
 * immediately) and queues a credit with `status: 'applied'` + the invoiceID. What a raw
 * invoice write cannot do is ADMIN's machinery, and this drain owns it:
 *
 *   1. recompute payment progress and advance the order at thresholds
 *      (first payment → deposit, 50% → in_production — forward-only, audited),
 *   2. email the receipt (with remaining balance),
 *   3. notify the client in-app, and
 *   4. mark the credit processed so the queue empties.
 *
 * See docs (efd-shop): CUSTOM-PAYMENTS-ADMIN-HANDOFF.md + CUSTOM_PAYMENT_RULES §16.
 *
 * Idempotency: each credit is CLAIMED first (first-wins on processedAt), so the cron
 * and an opportunistic drain racing on the same credit do the work once. If the side
 * effects fail after a claim, the claim is released so a later drain retries; the
 * failure is recorded on the credit. Credits still `pending_admin` (pre-fix strandees
 * with no invoice record) are the shop backfill's to convert — not touched here.
 */
import { db } from '@/lib/database';
import CustomOrdersModel, { CUSTOM_ORDER_STATUS } from '@/app/api/custom-orders/model';
import { getCustomPaymentProgress } from '@/services/customs/customInvoices.service';
import { advanceCustomOrderStatus } from '@/services/customs/customStatus';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { portalLink } from '@/lib/appUrls';

const CREDITS_COLLECTION = 'customPaymentCredits';

async function creditsCollection() {
  const dbi = await db.connect();
  return dbi.collection(CREDITS_COLLECTION);
}

/** Release a claim so a later drain retries, keeping the failure visible on the credit. */
async function releaseClaim(col, credit, error) {
  await col.updateOne(
    { _id: credit._id },
    {
      $set: { status: 'applied', lastError: String(error?.message || error), lastErrorAt: new Date(), updatedAt: new Date() },
      $unset: { processedAt: '' },
    },
  );
}

/**
 * Drain unprocessed shop payment credits — all of them (cron), or one order's
 * (opportunistic, when its billing is opened). Safe to call concurrently.
 * Returns { scanned, processed, failed }.
 */
export async function drainShopPaymentCredits({ customID = null, limit = 25 } = {}) {
  const col = await creditsCollection();
  const credits = await col
    .find({
      status: 'applied',
      invoiceID: { $exists: true, $nin: [null, ''] },
      processedAt: { $in: [null, undefined] },
      ...(customID ? { customID } : {}),
    })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();

  let processed = 0;
  let failed = 0;

  for (const credit of credits) {
    // First-wins claim: a concurrent drain that loses this update skips the credit.
    // eslint-disable-next-line no-await-in-loop
    const claim = await col.updateOne(
      { _id: credit._id, processedAt: { $in: [null, undefined] } },
      { $set: { status: 'processing', processedAt: new Date(), updatedAt: new Date() } },
    );
    if (claim.modifiedCount !== 1) continue;

    try {
      // eslint-disable-next-line no-await-in-loop
      const outcome = await processCredit(credit);
      // eslint-disable-next-line no-await-in-loop
      await col.updateOne(
        { _id: credit._id },
        { $set: { status: 'processed', ...outcome, updatedAt: new Date() }, $unset: { lastError: '', lastErrorAt: '' } },
      );
      processed += 1;
    } catch (e) {
      console.error(`[customs] shop credit ${credit.creditID || credit._id} drain failed:`, e?.message || e);
      // eslint-disable-next-line no-await-in-loop
      await releaseClaim(col, credit, e).catch(() => {});
      failed += 1;
    }
  }

  return { scanned: credits.length, processed, failed };
}

/** The admin-side effects for one credit. Throws to signal "release and retry later". */
async function processCredit(credit) {
  const order = await CustomOrdersModel.findById(credit.customID);
  if (!order) {
    // Nothing to advance and nobody to write to — retrying forever won't create the
    // order. Mark it processed with the note rather than wedging the queue.
    return { note: `custom order ${credit.customID} not found` };
  }

  // 1. Threshold advancement off the REAL ledger (the shop's invoice is already in it).
  const { progress } = await getCustomPaymentProgress(credit.customID);
  const target = progress.hasReached50 ? CUSTOM_ORDER_STATUS.IN_PRODUCTION : CUSTOM_ORDER_STATUS.DEPOSIT;
  const advanced = await advanceCustomOrderStatus(credit.customID, target, {
    reason: `shop payment ${progress.paymentProgress}%`,
  });

  // 2. In-app payment notification — parity with an admin-marked payment (best-effort).
  if (order.clientID) {
    await NotificationService.createNotification({
      userId: order.clientID,
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title: 'Payment received',
      message: `Your $${(Number(credit.amount) || 0).toFixed(2)} payment toward "${order.title || order.customID}" was received. Thank you!`,
      channels: ['inApp'],
      data: { customID: order.customID, invoiceID: credit.invoiceID, actionUrl: portalLink(order.customID, 'overview') },
    }).catch((e) => console.error('⚠️ shop-payment notification failed:', e.message));
  }

  // 2b. PAID IN FULL is the affiliate commission trigger — a shop payment can be the
  // one that completes the order. Best-effort; the commission cron is the backstop.
  if (progress.isFullyPaid && order.affiliate?.affiliateId && !order.affiliate?.commissionId) {
    try {
      const { earnCustomOrderCommission } = await import('@/services/affiliates/commissionEngine');
      await earnCustomOrderCommission(credit.customID);
    } catch (e) {
      console.error(`⚠️ affiliate commission for ${credit.customID} failed (cron will retry):`, e.message);
    }
  }

  // 3. Receipt with the remaining balance. sendCustomReceiptEmail cannot throw; a failed
  // send is recorded on the credit so it can be chased, not silently forgotten.
  const { sendCustomReceiptEmail } = await import('@/services/customs/customInvoiceDelivery');
  const receipt = await sendCustomReceiptEmail(credit.customID, credit.invoiceID)
    .then((r) => r.delivery)
    .catch((e) => ({ sent: false, error: e?.message || String(e) }));

  return {
    statusAdvanced: advanced.advanced ? target : null,
    paymentProgress: progress.paymentProgress,
    receipt,
  };
}
