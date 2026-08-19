import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { requireCustomsRead } from '@/lib/customsPermissions';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { awardClientMgmtBonus } from '@/services/customs/customProduction';
import { NotificationService } from '@/lib/notificationService';
import { sendShopAccountInvite } from '@/lib/shopInvite';
import { portalLink } from '@/lib/appUrls';

import { advanceCustomOrderStatus, notifyStatusMilestone } from '@/services/customs/customStatus';

// Deep-linked per notification below — see lib/appUrls.js portalLink().
// Milestone copy lives in customStatus.js so manual and automated transitions say the same thing.

/** GET /api/custom-orders/[customID] — returns the order + live margin (quote − piece COGS) */
export const GET = async (req, { params }) => {
  const { customID } = await params;
  // Read access: staff, or an artisan ASSIGNED to this order (full visibility — owner 2026-07-22).
  const { errorResponse } = await requireCustomsRead(customID);
  if (errorResponse) return errorResponse;

  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
  const margin = await CustomOrdersModel.marginFor(customID);
  return NextResponse.json({ order, margin }, { status: 200 });
};

/** PUT /api/custom-orders/[customID] — update fields (status changes append history) */
export const PUT = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await CustomOrdersModel.findById(customID);
  let updated = await CustomOrdersModel.updateById(customID, body, {
    changedBy: session.user.userID || session.user.email || '',
    reason: body.statusReason || '',
  });
  if (!updated) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  // On completion, award the client-management bonus (C8) — best-effort.
  if (updated.status === 'completed' && existing?.status !== 'completed') {
    try {
      await awardClientMgmtBonus({ customID });
      updated = await CustomOrdersModel.findById(customID);
    } catch (e) {
      console.error('Client-management bonus award failed:', e.message);
    }
  }

  // X1 — quote published (false→true edge): tell the client their quote is ready to review.
  // Best-effort; never blocks the save.
  try {
    const wasPublished = !!existing?.quote?.quotePublished;
    const nowPublished = !!updated?.quote?.quotePublished;
    if (!wasPublished && nowPublished) {
      // Publishing IS the quote stage — forward-only, so it never demotes a later status.
      const advanced = await advanceCustomOrderStatus(customID, 'quote', { reason: 'quote published', order: updated });
      if (advanced.advanced) updated = advanced.order;
    }
    if (!wasPublished && nowPublished && updated.clientID) {
      await NotificationService.createNotification({
        userId: updated.clientID,
        type: 'custom-quote-ready',
        title: 'Your quote is ready',
        message: `Your quote for "${updated.title || 'your custom piece'}" is ready to review.`,
        channels: ['inApp', 'email'],
        recipientEmail: updated.customerEmail,
        priority: 'high',
        data: { actionUrl: portalLink(customID, 'quote'), customID },
      });
      // Same re-invite as the QuoteTab route: a passwordless client gets the
      // claim link with quote copy; a claimed one gets nothing (shop no-ops).
      await sendShopAccountInvite(updated.clientID, 'quote');
    }
  } catch (e) {
    console.error('⚠️ custom-quote-ready notification failed:', e.message);
  }

  // X2 — milestone status change: notify the client on the mapped milestone transitions only
  // (skip cosmetic/no-op writes — fire only when status actually changed value). Guarded to the
  // MANUAL write: an automated advance above already notified through the shared path.
  if (body.status && updated.status === body.status && existing?.status !== updated.status) {
    await notifyStatusMilestone(updated, updated.status);
  }

  return NextResponse.json(updated, { status: 200 });
};
