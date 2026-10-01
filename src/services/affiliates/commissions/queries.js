import { db } from '@/lib/database';
import { COMMISSIONABLE_ORDER_STATUSES, COMMISSION_STATUS, commissionsCol, n, round2 } from './shared';
/**
 * REFERRED WORK THAT HASN'T EARNED YET — attributed orders with no commission on them.
 *
 * Without this an affiliate sees $0 and no sign anything is coming: they referred a
 * $6,000 ring three weeks ago and the dashboard looks identical to having referred
 * nothing. The estimate is explicitly an ESTIMATE (the quote can still change before
 * it's paid) and is only possible for custom orders, where profit is quotable;
 * a product sale's profit isn't derivable, so it shows as awaiting review instead.
 */
export async function listPendingWork(affiliateId) {
  const dbi = await db.connect();
  const filter = { 'affiliate.affiliateId': affiliateId, 'affiliate.commissionId': null };

  const [customOrders, shopOrders] = await Promise.all([
    dbi.collection('customOrders')
      .find(filter, { projection: { _id: 0, customID: 1, title: 1, status: 1, quote: 1, affiliate: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(50).toArray(),
    dbi.collection('orders')
      .find(filter, { projection: { _id: 0, orderId: 1, kind: 1, fulfillmentStatus: 1, total: 1, affiliate: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(50).toArray(),
  ]);

  const rows = [];
  let estimatedTotal = 0;

  for (const o of customOrders) {
    const rate = n(o.affiliate?.commissionRate);
    const profit = round2(Math.max(0, n(o.quote?.quoteTotal) - n(o.quote?.cog)));
    const estimate = round2(profit * rate);
    // Cancelled work will never pay; show the row so it isn't a mystery, but keep it
    // OUT of the headline estimate. An affiliate told "$260 coming" when $60 of it is
    // a dead order is the same lie the customs page used to tell with "money in
    // pipeline" — a total is only useful if every dollar in it can actually arrive.
    const willNeverPay = o.status === 'cancelled';
    if (!willNeverPay) estimatedTotal = round2(estimatedTotal + estimate);
    rows.push({
      kind: 'custom_order', sourceID: o.customID, title: o.title || 'Custom piece',
      stage: o.status, rate, estimate, willNeverPay,
      createdAt: o.createdAt || null,
    });
  }

  for (const o of shopOrders) {
    const settled = COMMISSIONABLE_ORDER_STATUSES.includes(o.fulfillmentStatus);
    rows.push({
      kind: o.kind === 'made_to_order' ? 'made_to_order' : 'product_sale',
      sourceID: o.orderId, title: o.kind === 'made_to_order' ? 'Made-to-order piece' : 'Shop purchase',
      stage: settled ? 'awaiting review' : o.fulfillmentStatus,
      rate: n(o.affiliate?.commissionRate), estimate: null, // product profit isn't derivable
      willNeverPay: ['rejected_capacity', 'cancelled_pre_production', 'payment_setup_failed'].includes(o.fulfillmentStatus),
      createdAt: o.createdAt || null,
    });
  }

  rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return { rows, estimatedTotal, count: rows.filter((r) => !r.willNeverPay).length };
}

/**
 * Every commission awaiting a profit figure, across ALL affiliates — admin's queue.
 * Previously `needs_review` existed only on an individual affiliate's page, so a
 * commission could wait indefinitely simply because nobody opened that page.
 */
export async function listReviewQueue({ limit = 100 } = {}) {
  const col = await commissionsCol();
  const rows = await col
    .find({ status: COMMISSION_STATUS.NEEDS_REVIEW }, { projection: { _id: 0 } })
    .sort({ createdAt: 1 }) // oldest first — the ones that have waited longest
    .limit(limit)
    .toArray();
  return {
    rows: rows.map((c) => ({
      commissionId: c.commissionId,
      affiliateId: c.affiliateId,
      affiliateCode: c.affiliateCode,
      sourceID: c.sourceID,
      conversionType: c.conversionType,
      rate: c.rate,
      orderTotal: c.basis?.orderTotal ?? null,
      reviewReason: c.basis?.reviewReason || null,
      createdAt: c.createdAt || null,
    })),
    count: rows.length,
  };
}

/**
 * Ledger + totals for one affiliate (their dashboard and admin's detail page).
 * Earned rows carry their PAYROLL state so "earned" and "actually paid" are
 * distinguishable — an affiliate asking "where's my money" should be able to see
 * whether it's waiting for the next payroll run or already went out.
 */
export async function listCommissions(affiliateId, { limit = 100 } = {}) {
  const col = await commissionsCol();
  const commissions = await col
    .find({ affiliateId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  // Resolve payroll state for the payouts that exist (one query, not one per row).
  const logIds = commissions.map((c) => c.laborLogId).filter(Boolean);
  const payrollByLog = {};
  if (logIds.length) {
    const logsCol = await db.dbLaborLogs();
    const logs = await logsCol
      .find({ logID: { $in: logIds } }, { projection: { _id: 0, logID: 1, payrollStatus: 1, payrolledAt: 1, payrollBatchID: 1 } })
      .toArray();
    for (const l of logs) payrollByLog[l.logID] = l;
  }

  const totals = { earned: 0, paidOut: 0, awaitingPayroll: 0, pendingReview: 0, entries: commissions.length };
  const withPayroll = commissions.map((c) => {
    const log = c.laborLogId ? payrollByLog[c.laborLogId] : null;
    const payrollStatus = log?.payrollStatus || (c.status === COMMISSION_STATUS.EARNED && c.amount === 0 ? 'none' : null);
    if (c.status === COMMISSION_STATUS.EARNED) {
      totals.earned = round2(totals.earned + n(c.amount));
      if (payrollStatus === 'paid') totals.paidOut = round2(totals.paidOut + n(c.amount));
      else if (n(c.amount) > 0) totals.awaitingPayroll = round2(totals.awaitingPayroll + n(c.amount));
    }
    if (c.status === COMMISSION_STATUS.NEEDS_REVIEW) totals.pendingReview += 1;
    return { ...c, payrollStatus, payrolledAt: log?.payrolledAt || null };
  });

  return { commissions: withPayroll, totals };
}

