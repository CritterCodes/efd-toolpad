import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { syncQuoteToWorkOrders } from '@/services/customs/customProduction';
import { advanceCustomOrderStatus } from '@/services/customs/customStatus';
import { NotificationService } from '@/lib/notificationService';
import { portalLink } from '@/lib/appUrls';
import { sendShopAccountInvite } from '@/lib/shopInvite';
import { paidGateConflict, recordPrice, totalPaidFor } from '@/services/customs/payOverTime';

// Deep-linked per order below — a quote-ready notice must open the quote, not a list.

/**
 * PUT /api/custom-orders/[customID]/quote
 * Body: quote inputs (materialCosts, laborCost, rushMultiplier, castingCost,
 * shippingCost, designFee, markup). Recomputes quoteTotal and returns order + margin.
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const quote = await req.json().catch(() => ({}));
  const existing = await CustomOrdersModel.findById(customID);
  if (!existing) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  // THE PAID-GATE LOCK (docs/manufacturing/PAY_OVER_TIME_CONTRACT.md §6). Once payments cover a stage,
  // its price is the price the customer paid; an edit that would move it is refused rather than
  // silently re-pricing something already bought. Edits that leave paid stages alone go through.
  if (existing.quote?.quotePublished && Array.isArray(existing.quote?.gates) && existing.quote.gates.length) {
    const paid = await totalPaidFor(customID);
    if (paid > 0) {
      let preview;
      try {
        preview = await CustomOrdersModel.normalizeQuote({ ...existing.quote, ...quote });
      } catch (e) {
        if (/markup/i.test(e?.message || '')) return NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
      }
      const conflict = paidGateConflict(existing.quote.gates, preview.gates, paid);
      if (conflict) {
        return NextResponse.json({
          error: `The client has already paid for the ${conflict.name} stage ($${Number(conflict.amount).toFixed(2)}). This edit would change it, so it wasn't saved. Paid stages are locked.`,
        }, { status: 409 });
      }
    }
  }

  // A rejected markup is the quoter's typo, not a server fault — it has to come back as a message they
  // can read and fix, or a mistyped decimal point turns into an opaque 500.
  let updated;
  try {
    updated = await CustomOrdersModel.updateById(customID, { quote });
  } catch (e) {
    if (/markup/i.test(e?.message || '')) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // PRICE HISTORY: the first entry on publish, then one whenever a published quote's total changes,
  // so the customer's "prices as of" date and the record of what moved are always true.
  const publishedNow = !existing.quote?.quotePublished && updated.quote?.quotePublished;
  const editedLive = existing.quote?.quotePublished && updated.quote?.quotePublished
    && Math.round((Number(existing.quote?.total) || 0) * 100) !== Math.round((Number(updated.quote?.total) || 0) * 100);
  if (publishedNow || editedLive) {
    await recordPrice(customID, updated.quote, publishedNow ? 'published' : 'quote-edit');
    updated = await CustomOrdersModel.findById(customID);
  }

  // This is the route used by QuoteTab. Fire only on the unpublished -> published edge.
  if (!existing.quote?.quotePublished && updated.quote?.quotePublished) {
    // A published quote IS the quote stage — forward-only, so re-publishing an order
    // already in deposit/production never demotes it.
    const advanced = await advanceCustomOrderStatus(customID, 'quote', { reason: 'quote published', order: updated });
    if (advanced.advanced) updated = advanced.order;
  }
  if (!existing.quote?.quotePublished && updated.quote?.quotePublished && updated.clientID) {
    NotificationService.createNotification({
      userId: updated.clientID,
      type: 'custom-quote-ready',
      title: 'Your quote is ready',
      message: `Your quote for "${updated.title || 'your custom piece'}" is ready to review.`,
      channels: ['inApp', 'email'],
      recipientEmail: updated.customerEmail,
      priority: 'high',
      data: { actionUrl: portalLink(customID, 'quote'), customID },
    }).catch((e) => console.error('custom-quote-ready notification failed:', e.message));
    // A quote the client can't sign in to see is a quote they can't accept or pay —
    // re-invite anyone still passwordless (the shop no-ops for claimed accounts).
    await sendShopAccountInvite(updated.clientID, 'quote');
  }

  // Reconcile any already-generated (pre-QC) bench work orders with the edited plan:
  // update hours, append added tasks, cull removed ones, spawn WOs for new lanes.
  // Non-fatal — never block saving the quote.
  let wo = { updated: 0, spawned: 0, removed: 0 };
  try {
    wo = await syncQuoteToWorkOrders({ customID });
  } catch (e) {
    console.warn('[customs] quote→WO sync failed:', e.message);
  }

  const margin = await CustomOrdersModel.marginFor(customID);
  return NextResponse.json({ order: updated, margin, workOrdersSync: wo, workOrdersSynced: wo.updated }, { status: 200 });
};
