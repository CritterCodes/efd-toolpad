import CustomOrdersModel from '@/app/api/custom-orders/model';
import { resolveOrderProfit } from '@/services/affiliates/orderProfit';
import { COMMISSIONABLE_ORDER_STATUSES, COMMISSION_STATUS, affiliateFor, claimSource, commissionsCol, n, notifyAdminsOfReview, notifyEarned, releaseClaim, round2, setSourceStatus, writePayout } from './shared';
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

  // Try to price it ourselves. EVERY product line — catalogue, RTS, MTO, customized —
  // resolves from the product's recorded cost basis, because `productContract` writes one
  // onto every product it creates. Only a product with no cost recorded at all falls
  // through to review WITH ITS REASON, rather than a whole class of sale queueing forever.
  const priced = await resolveOrderProfit(order).catch((e) => {
    console.error(`[affiliates] profit resolve for ${order.orderId} failed:`, e.message);
    return { ok: false, needsReview: true, reason: 'could not read product costs' };
  });

  // A cart that was ENTIRELY custom-order payments has nothing of its own to
  // commission — the customs trigger pays that money. Not a review item.
  if (!priced.ok && priced.needsReview === false) {
    await setSourceStatus('orders', { orderId: order.orderId }, 'custom_only_skipped');
    return { recorded: false, reason: priced.reason };
  }

  if (!(await claimSource('orders', { orderId: order.orderId }, commissionId))) {
    return { recorded: false, reason: 'claimed by a concurrent trigger' };
  }

  try {
    const auto = priced.ok;
    const amount = auto ? round2(priced.profit * rate) : 0;
    const commission = {
      commissionId,
      affiliateId: affiliate.affiliateId,
      affiliateCode: aff.affiliateCode || affiliate.code,
      affiliateUserId: affiliate.userId,
      sourceType: 'shop_order',
      sourceID: order.orderId,
      conversionType: 'product_sale',
      rate,
      basis: auto
        ? {
          kind: 'product_sale_cost_basis',
          revenue: priced.revenue,      // pre-tax, never the tax-inclusive total
          cost: priced.cost,            // Σ product costBasis × qty
          profit: priced.profit,
          lines: priced.lines,          // per-line workings, so the number is explainable
          // Whether ANY line priced off a live-metal estimate rather than a made piece's
          // measured COGS. An estimate is a fine basis to pay on, but it should be visible
          // as one — a metal move between listing and sale moves the real margin.
          costEstimated: priced.lines.some((l) => l.costBasisSource !== 'actual'),
          customPaymentPortion: customTotal || 0,
        }
        : {
          kind: 'product_sale_pending_profit',
          orderTotal,
          subtotal: n(order.subtotal) || null,
          // The shop order stores `tax` (checkout route); `taxAmount` is the customs shape.
          taxAmount: n(order.tax ?? order.taxAmount) || null,
          customPaymentPortion: customTotal || 0,
          // Say WHY a human is needed, so review is a decision and not a mystery.
          reviewReason: priced.reason,
          note: 'Enter the pre-tax profit to approve — this order could not be priced automatically.',
        },
      amount,
      status: auto ? COMMISSION_STATUS.EARNED : COMMISSION_STATUS.NEEDS_REVIEW,
      laborLogId: null,
      createdAt: new Date(),
      earnedAt: auto ? new Date() : null,
    };

    const col = await commissionsCol();
    await col.updateOne({ commissionId }, { $setOnInsert: commission }, { upsert: true });

    if (auto) {
      if (amount > 0) {
        const laborLogId = await writePayout({ commission, affiliate });
        await col.updateOne({ commissionId }, { $set: { laborLogId } });
      }
      await setSourceStatus('orders', { orderId: order.orderId }, COMMISSION_STATUS.EARNED);
      notifyEarned(affiliate, commission);
      return { recorded: true, commissionId, earned: true, amount };
    }

    await setSourceStatus('orders', { orderId: order.orderId }, COMMISSION_STATUS.NEEDS_REVIEW);
    await notifyAdminsOfReview(commission).catch(() => {});
    return { recorded: true, commissionId, earned: false, reason: priced.reason };
  } catch (e) {
    await releaseClaim('orders', { orderId: order.orderId }, e).catch(() => {});
    throw e;
  }
}

