import { db } from '@/lib/database';
import { NotificationService } from '@/lib/notificationService';
import { COMMISSIONABLE_ORDER_STATUSES, COMMISSION_STATUS, affiliateFor, commissionsCol, n, notifyEarned, round2, setSourceStatus, writePayout } from './shared';
import { earnCustomOrderCommission, recordProductSaleCommission } from './earn';
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
 * Tell an affiliate when a referral CONVERTS, not only when it pays.
 *
 * Attribution happens in the shop, which can't reach admin's notification layer, so
 * this sweep is the notifier. The moment matters: the gap between "someone used my
 * link" and "an order finally paid in full" can be months on a custom piece, and
 * silence across it reads as the link not working.
 *
 * Stamped with `affiliate.conversionNotifiedAt` so it fires exactly once per order.
 */
export async function notifyNewConversions({ limit = 50 } = {}) {
  const dbi = await db.connect();
  const filter = {
    'affiliate.affiliateId': { $exists: true, $nin: [null, ''] },
    'affiliate.conversionNotifiedAt': { $in: [null, undefined] },
  };
  const sources = [
    { collection: 'customOrders', idField: 'customID', label: 'custom request' },
    { collection: 'orders', idField: 'orderId', label: 'purchase' },
  ];

  let notified = 0;
  for (const src of sources) {
    // eslint-disable-next-line no-await-in-loop
    const docs = await dbi.collection(src.collection)
      .find(filter, { projection: { _id: 0, [src.idField]: 1, affiliate: 1 } })
      .limit(limit).toArray();

    for (const doc of docs) {
      const id = doc[src.idField];
      // Claim first — same rule as everywhere else here, so two sweeps can't double-notify.
      // eslint-disable-next-line no-await-in-loop
      const claim = await dbi.collection(src.collection).updateOne(
        { [src.idField]: id, 'affiliate.conversionNotifiedAt': { $in: [null, undefined] } },
        { $set: { 'affiliate.conversionNotifiedAt': new Date() } },
      );
      if (claim.modifiedCount !== 1) continue;

      try {
        // eslint-disable-next-line no-await-in-loop
        const affiliate = await affiliateFor(doc.affiliate.affiliateId);
        if (!affiliate?.userId) continue;
        // eslint-disable-next-line no-await-in-loop
        await NotificationService.createNotification({
          userId: affiliate.userId,
          type: 'affiliate-referral-converted',
          title: 'Someone used your link',
          message: `A ${src.label} came in through your referral link. You'll earn your commission once it's paid in full.`,
          channels: ['inApp'],
          data: { sourceID: id, affiliateId: affiliate.affiliateId },
        });
        notified += 1;
      } catch (e) {
        console.error(`[affiliates] conversion notify for ${id} failed:`, e.message);
      }
    }
  }
  return { notified };
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

