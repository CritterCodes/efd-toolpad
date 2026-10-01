import { db } from '@/lib/database';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { NotificationService } from '@/lib/notificationService';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';
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

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const n = (v) => Number(v) || 0;

export async function commissionsCol() {
  const dbi = await db.connect();
  return dbi.collection('affiliateCommissions');
}

export async function affiliateFor(affiliateId) {
  const col = await db.dbAffiliates();
  return col.findOne({ affiliateId });
}

/** The payout: a flat-fee payroll entry to the affiliate — the client-mgmt-bonus shape. */
export async function writePayout({ commission, affiliate }) {
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

export function notifyEarned(affiliate, commission) {
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

/**
 * Tell admin a commission needs pricing. Without this, a review item is only findable
 * by opening that particular affiliate's detail page — so an affiliate could simply
 * never be paid and nobody would know. Best-effort; the queue on the affiliates list
 * is the durable surface, this is the nudge.
 */
export async function notifyAdminsOfReview(commission) {
  await notifyAllAdmins({
    type: 'affiliate-commission-review',
    title: 'Affiliate commission needs a profit figure',
    message: `${commission.affiliateCode} earned a commission on ${commission.sourceID}, but it couldn't be priced automatically — ${commission.basis?.reviewReason || 'cost unavailable'}. Enter the pre-tax profit to approve it.`,
    actionUrl: `${adminBase()}/dashboard/admin/affiliates/${commission.affiliateId}`,
    priority: 'normal',
    relatedData: { commissionId: commission.commissionId, affiliateId: commission.affiliateId },
  });
}

/** First-wins claim on the source document. Returns true when THIS caller owns the work. */
export async function claimSource(collectionName, filter, commissionId) {
  const dbi = await db.connect();
  const res = await dbi.collection(collectionName).updateOne(
    { ...filter, 'affiliate.commissionId': null },
    { $set: { 'affiliate.commissionId': commissionId, 'affiliate.commissionStatus': 'processing', updatedAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

export async function setSourceStatus(collectionName, filter, status) {
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
export async function releaseClaim(collectionName, filter, error) {
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

