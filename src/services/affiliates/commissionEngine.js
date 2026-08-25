/**
 * Affiliate commission engine (owner rulings, 2026-08-20):
 *
 *   BASE    — pre-tax PROFIT on the piece, not revenue and not after tax. For custom
 *             orders that is the QUOTED profit (quote.quoteTotal − quote.cog): it is
 *             deterministic at the trigger (actual bench costs may still be accruing
 *             when the order gets fully paid), it can't punish the affiliate for shop
 *             cost overruns, and both figures are recorded on the commission for audit.
 *   TRIGGER — the order is PAID IN FULL (paymentProgress.isFullyPaid). Never at
 *             request/quote (requests die), never waiting for delivery (money's in).
 *   RAIL    — the payroll ledger: a flat-fee laborLogs entry (creditedValue, 0 hours),
 *             the same carrier as the client-management bonus, so payouts ride the
 *             machinery that already pays people and show up in payroll batches.
 *   RATE    — the SNAPSHOT taken at attribution time (order.affiliate.commissionRate),
 *             never the live profile rate; changing an affiliate's rate later must not
 *             reprice history.
 *
 * PRODUCT SALES cannot derive profit server-side (product COGS isn't reliably joined
 * from a shop order line), so their commissions are created as NEEDS_REVIEW carrying
 * the order's revenue figures; admin enters the profit on the affiliate detail page and
 * approval computes the amount at the snapshotted rate and writes the payout.
 *
 * Idempotency is claim-first, like the shop-payment drain: the commissionId is
 * deterministic per source (`comm-<sourceID>`), and the source document's
 * `affiliate.commissionId` is stamped with a null-guarded update BEFORE the commission
 * is written — two triggers racing (invoice mark-paid, the cron) do the work once.
 */
import { db } from '@/lib/database';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { NotificationService } from '@/lib/notificationService';

export const COMMISSION_STATUS = {
  NEEDS_REVIEW: 'needs_review', // product sale awaiting an admin-entered profit
  EARNED: 'earned',             // amount computed, payout entry written
  VOID: 'void',                 // admin rejected (e.g. refund, all-custom cart)
};

/**
 * Shop-order states where the money LANDED AND THE SALE STANDS — the only ones that
 * may earn a commission. The shop uses a different terminal word per order kind:
 *
 *   paid      cart / RTS / catalog  (lib/cartFulfillment)
 *   accepted  made-to-order         (lib/mtoCheckoutCapacity — piece created, edition committed)
 *
 * This list was `['paid']` alone until 2026-08-25, which silently excluded EVERY MTO
 * sale: the shop stamped attribution and consumed the referral, so the affiliate saw
 * the conversion on their dashboard and simply never got paid for it.
 *
 * DELIBERATELY AN ALLOWLIST, not "has paidAt". Two paid-but-void states would slip
 * through a paidAt test: `rejected_capacity` (charged, edition was full, refund owed)
 * and `cancelled_pre_production` (accepted — so it DOES carry paidAt — then cancelled).
 * Fail-closed is the right direction here: a commission that never fires is visible and
 * recoverable, one paid on a refunded order is money already out the door.
 */
export const COMMISSIONABLE_ORDER_STATUSES = ['paid', 'accepted'];

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const n = (v) => Number(v) || 0;

async function commissionsCol() {
  const dbi = await db.connect();
  return dbi.collection('affiliateCommissions');
}

async function affiliateFor(affiliateId) {
  const col = await db.dbAffiliates();
  return col.findOne({ affiliateId });
}

/** The payout: a flat-fee payroll entry to the affiliate — the client-mgmt-bonus shape. */
async function writePayout({ commission, affiliate }) {
  const log = await RepairLaborLogsModel.create({
    workOrderID: commission.commissionId, // no bench WO exists; the commission is the reference
    sourceType: 'affiliate_commission',
    sourceID: commission.sourceID,
    primaryJewelerUserID: affiliate.userId,
    primaryJewelerName: affiliate.name || affiliate.code,
    creditedLaborHours: 0,
    creditedValue: commission.amount,
    sourceAction: 'affiliate_commission',
    requiresAdminReview: false,
    payer: 'efd',
    notes: `Affiliate commission — ${Math.round(commission.rate * 1000) / 10}% of pre-tax profit on ${commission.sourceID}.`,
  });
  // RepairLaborLogsModel.create returns the entry; `logID` is its canonical id.
  return log?.logID || null;
}

function notifyEarned(affiliate, commission) {
  if (!affiliate?.userId) return;
  NotificationService.createNotification({
    userId: affiliate.userId,
    type: 'affiliate-commission-earned',
    title: 'You earned a commission',
    message: `$${commission.amount.toFixed(2)} commission earned on a referred ${commission.conversionType === 'product_sale' ? 'purchase' : 'custom order'}. It will be included in payroll.`,
    channels: ['inApp'],
    data: { commissionId: commission.commissionId, sourceID: commission.sourceID },
  }).catch((e) => console.error('⚠️ commission-earned notification failed:', e.message));
}

/** First-wins claim on the source document. Returns true when THIS caller owns the work. */
async function claimSource(collectionName, filter, commissionId) {
  const dbi = await db.connect();
  const res = await dbi.collection(collectionName).updateOne(
    { ...filter, 'affiliate.commissionId': null },
    { $set: { 'affiliate.commissionId': commissionId, 'affiliate.commissionStatus': 'processing', updatedAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

async function setSourceStatus(collectionName, filter, status) {
  const dbi = await db.connect();
  await dbi.collection(collectionName).updateOne(filter, { $set: { 'affiliate.commissionStatus': status } });
}

/**
 * Undo a claim so the sweep retries. Without this, a failure BETWEEN claiming and
 * writing the commission would leave the source stamped with a commissionId and no
 * commission behind it — the cron skips claimed sources, so the affiliate would simply
 * never be paid, silently. Releasing is the safe direction: the claim is what makes
 * double-paying impossible, and re-earning is idempotent on the deterministic id.
 */
async function releaseClaim(collectionName, filter, error) {
  const dbi = await db.connect();
  await dbi.collection(collectionName).updateOne(filter, {
    $set: {
      'affiliate.commissionId': null,
      'affiliate.commissionStatus': null,
      'affiliate.commissionError': String(error?.message || error),
      'affiliate.commissionErrorAt': new Date(),
    },
  });
}

/**
 * Custom order fully paid → EARN. Safe to call speculatively (from mark-paid, the shop
 * payment drain, and the cron): it re-checks the trigger and no-ops until it holds.
 */
export async function earnCustomOrderCommission(customID) {
  const order = await CustomOrdersModel.findById(customID);
  const aff = order?.affiliate;
  if (!aff?.affiliateId) return { earned: false, reason: 'no attribution' };
  if (aff.commissionId) return { earned: false, reason: 'already processed' };

  // TRIGGER: paid in full, from the real ledger. (Lazy import — that service's paid
  // path calls back into this engine.)
  const { getCustomPaymentProgress } = await import('@/services/customs/customInvoices.service');
  const { progress } = await getCustomPaymentProgress(customID);
  if (!progress.isFullyPaid) return { earned: false, reason: 'not fully paid' };

  const affiliate = await affiliateFor(aff.affiliateId);
  if (!affiliate) return { earned: false, reason: 'affiliate missing' };

  // RATE: attribution snapshot first; profile rate only for pre-snapshot attributions.
  const rate = n(aff.commissionRate) > 0 ? n(aff.commissionRate) : n(affiliate.commissionRate);
  // BASE: pre-tax quoted profit on the piece.
  const revenue = n(order.quote?.quoteTotal);
  const cost = n(order.quote?.cog);
  const profit = round2(Math.max(0, revenue - cost));
  const amount = round2(profit * rate);
  const commissionId = `comm-${customID}`;

  if (!(await claimSource('customOrders', { customID }, commissionId))) {
    return { earned: false, reason: 'claimed by a concurrent trigger' };
  }

  try {
    const commission = {
      commissionId,
      affiliateId: affiliate.affiliateId,
      affiliateCode: aff.affiliateCode || affiliate.code,
      affiliateUserId: affiliate.userId,
      sourceType: 'custom_order',
      sourceID: customID,
      conversionType: aff.attributionType || 'custom_request',
      rate,
      basis: {
        kind: 'custom_quote_profit',
        revenue, cost, profit,
        // Recorded for audit: what the LIVE margin said at earn time (actuals may still accrue).
        liveMarginAtEarn: round2(n((await CustomOrdersModel.marginFor(customID))?.margin)),
      },
      amount,
      status: COMMISSION_STATUS.EARNED,
      laborLogId: null,
      createdAt: new Date(),
      earnedAt: new Date(),
    };

    const col = await commissionsCol();
    await col.updateOne({ commissionId }, { $setOnInsert: commission }, { upsert: true });

    // A zero-profit order earns a $0 commission record (visible, explainable) and no payout line.
    if (amount > 0) {
      const laborLogId = await writePayout({ commission, affiliate });
      await col.updateOne({ commissionId }, { $set: { laborLogId } });
    }
    await setSourceStatus('customOrders', { customID }, COMMISSION_STATUS.EARNED);
    notifyEarned(affiliate, commission);
    return { earned: true, commissionId, amount };
  } catch (e) {
    await releaseClaim('customOrders', { customID }, e).catch(() => {});
    throw e;
  }
}

/**
 * Paid shop order carrying attribution → a NEEDS_REVIEW commission. Product profit
 * isn't derivable server-side, so revenue figures are recorded and admin enters the
 * profit at approval. Pure custom-payment carts are skipped — the customs trigger
 * owns those dollars and double-earning one payment is the failure mode to fear.
 */
export async function recordProductSaleCommission(order) {
  const aff = order?.affiliate;
  if (!aff?.affiliateId || aff.commissionId) return { recorded: false };

  // The status rule lives HERE, with the money — not only in the sweep's query. The
  // drain is one caller today; a future hook calling this directly must not be able to
  // commission a refunded or unpaid order just because it skipped the query.
  if (!COMMISSIONABLE_ORDER_STATUSES.includes(order.fulfillmentStatus)) {
    return { recorded: false, reason: `order is ${order.fulfillmentStatus || 'unpaid'}` };
  }

  const allocations = Array.isArray(order.customAllocations) ? order.customAllocations : [];
  const customTotal = round2(allocations.reduce((s, a) => s + n(a.amount), 0));
  const orderTotal = n(order.total ?? order.amount);
  if (customTotal > 0 && orderTotal > 0 && customTotal >= orderTotal - 0.01) {
    await setSourceStatus('orders', { orderId: order.orderId }, 'custom_only_skipped');
    return { recorded: false, reason: 'pure custom-payment cart — customs trigger owns it' };
  }

  const affiliate = await affiliateFor(aff.affiliateId);
  if (!affiliate) return { recorded: false, reason: 'affiliate missing' };

  const rate = n(aff.commissionRate) > 0 ? n(aff.commissionRate) : n(affiliate.commissionRate);
  const commissionId = `comm-${order.orderId}`;

  if (!(await claimSource('orders', { orderId: order.orderId }, commissionId))) {
    return { recorded: false, reason: 'claimed by a concurrent trigger' };
  }

  try {
    const commission = {
      commissionId,
      affiliateId: affiliate.affiliateId,
      affiliateCode: aff.affiliateCode || affiliate.code,
      affiliateUserId: affiliate.userId,
      sourceType: 'shop_order',
      sourceID: order.orderId,
      conversionType: 'product_sale',
      rate,
      basis: {
        kind: 'product_sale_pending_profit',
        orderTotal,
        subtotal: n(order.subtotal) || null,
        // The shop order stores `tax` (checkout route); `taxAmount` is the customs shape.
        taxAmount: n(order.tax ?? order.taxAmount) || null,
        customPaymentPortion: customTotal || 0,
        note: 'Profit entered by admin at approval — product COGS is not derivable from the order.',
      },
      amount: 0,
      status: COMMISSION_STATUS.NEEDS_REVIEW,
      laborLogId: null,
      createdAt: new Date(),
      earnedAt: null,
    };

    const col = await commissionsCol();
    await col.updateOne({ commissionId }, { $setOnInsert: commission }, { upsert: true });
    await setSourceStatus('orders', { orderId: order.orderId }, COMMISSION_STATUS.NEEDS_REVIEW);
    return { recorded: true, commissionId };
  } catch (e) {
    await releaseClaim('orders', { orderId: order.orderId }, e).catch(() => {});
    throw e;
  }
}

/** Admin approves a needs-review commission with the real pre-tax profit. */
export async function approveCommission({ commissionId, profit, approvedBy }) {
  const col = await commissionsCol();
  const commission = await col.findOne({ commissionId });
  if (!commission) throw new Error('Commission not found.');
  if (commission.status !== COMMISSION_STATUS.NEEDS_REVIEW) throw new Error('Only a needs-review commission can be approved.');
  const p = round2(Math.max(0, n(profit)));
  const amount = round2(p * n(commission.rate));

  const affiliate = await affiliateFor(commission.affiliateId);
  if (!affiliate) throw new Error('Affiliate not found.');

  const updated = {
    ...commission,
    amount,
    status: COMMISSION_STATUS.EARNED,
    earnedAt: new Date(),
    basis: { ...commission.basis, profit: p, approvedBy, approvedAt: new Date() },
  };
  let laborLogId = null;
  if (amount > 0) laborLogId = await writePayout({ commission: updated, affiliate });

  await col.updateOne(
    { commissionId, status: COMMISSION_STATUS.NEEDS_REVIEW },
    { $set: { amount, status: COMMISSION_STATUS.EARNED, earnedAt: updated.earnedAt, basis: updated.basis, laborLogId } },
  );
  await setSourceStatus(commission.sourceType === 'shop_order' ? 'orders' : 'customOrders',
    commission.sourceType === 'shop_order' ? { orderId: commission.sourceID } : { customID: commission.sourceID },
    COMMISSION_STATUS.EARNED);
  notifyEarned(affiliate, updated);
  return { commissionId, amount };
}

/** Admin voids a commission (refund, mistake, all-custom cart that slipped through). */
export async function voidCommission({ commissionId, reason = '', voidedBy }) {
  const col = await commissionsCol();
  const commission = await col.findOne({ commissionId });
  if (!commission) throw new Error('Commission not found.');
  if (commission.status === COMMISSION_STATUS.EARNED && commission.laborLogId) {
    // The payout line already rides payroll — clawing it back is a payroll operation,
    // not a silent delete. Refuse and make the human do it deliberately.
    throw new Error('This commission already has a payroll entry. Void the payroll line first, then void the commission.');
  }
  await col.updateOne({ commissionId }, {
    $set: { status: COMMISSION_STATUS.VOID, voidReason: reason, voidedBy, voidedAt: new Date() },
  });
  return { commissionId, status: COMMISSION_STATUS.VOID };
}

/**
 * The cron sweep — the guaranteed consumer behind the event hooks. Scans attributed,
 * unprocessed sources: custom orders get the trigger re-checked; paid shop orders get
 * a needs-review record. Both paths are claim-first, so overlap with hooks is safe.
 */
export async function drainCommissions({ limit = 50 } = {}) {
  const dbi = await db.connect();
  let custom = 0; let product = 0; let failed = 0;

  const customOrders = await dbi.collection('customOrders')
    .find(
      { 'affiliate.affiliateId': { $exists: true, $nin: [null, ''] }, 'affiliate.commissionId': null },
      { projection: { _id: 0, customID: 1 } },
    )
    .limit(limit).toArray();
  for (const o of customOrders) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await earnCustomOrderCommission(o.customID);
      if (r.earned) custom += 1;
    } catch (e) { failed += 1; console.error(`[affiliates] commission for ${o.customID} failed:`, e.message); }
  }

  const shopOrders = await dbi.collection('orders')
    .find(
      {
        'affiliate.affiliateId': { $exists: true, $nin: [null, ''] },
        'affiliate.commissionId': null,
        // Covers BOTH kinds: cart/RTS ('paid') and made-to-order ('accepted').
        fulfillmentStatus: { $in: COMMISSIONABLE_ORDER_STATUSES },
      },
      { projection: { _id: 0 } },
    )
    .limit(limit).toArray();
  for (const order of shopOrders) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await recordProductSaleCommission(order);
      if (r.recorded) product += 1;
    } catch (e) { failed += 1; console.error(`[affiliates] commission for ${order.orderId} failed:`, e.message); }
  }

  return { customScanned: customOrders.length, shopScanned: shopOrders.length, custom, product, failed };
}

/** Ledger + totals for one affiliate (their dashboard and admin's detail page). */
export async function listCommissions(affiliateId, { limit = 100 } = {}) {
  const col = await commissionsCol();
  const commissions = await col
    .find({ affiliateId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const totals = { earned: 0, pendingReview: 0, entries: commissions.length };
  for (const c of commissions) {
    if (c.status === COMMISSION_STATUS.EARNED) totals.earned = round2(totals.earned + n(c.amount));
    if (c.status === COMMISSION_STATUS.NEEDS_REVIEW) totals.pendingReview += 1;
  }
  return { commissions, totals };
}
