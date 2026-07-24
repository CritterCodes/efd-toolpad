import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { requireCustomsRead } from '@/lib/customsPermissions';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { awardClientMgmtBonus } from '@/services/customs/customProduction';
import { NotificationService } from '@/lib/notificationService';

const PORTAL_URL = `${process.env.NEXT_PUBLIC_APP_URL || ''}/custom-work/portal`;

// Milestone statuses that warrant a customer notification, with friendly copy.
// Cosmetic / intermediate writes (pending, consultation, quote, deposit) are skipped.
const CUSTOM_STATUS_NOTIFICATIONS = {
  design: {
    title: 'Your design is underway',
    message: 'We\'ve started designing your custom piece. We\'ll share the design with you soon.',
  },
  in_production: {
    title: 'Your piece is in production',
    message: 'Great news — your custom piece is now being made at our bench.',
  },
  qc: {
    title: 'Your piece is in final review',
    message: 'Your custom piece is in quality control — the last step before it\'s ready.',
  },
  completed: {
    title: 'Your custom piece is complete',
    message: 'Your custom piece is finished! We\'ll be in touch with next steps.',
  },
  delivered: {
    title: 'Your custom piece has been delivered',
    message: 'Your custom piece has been delivered. Thank you for working with us!',
  },
};

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
    if (!wasPublished && nowPublished && updated.clientID) {
      await NotificationService.createNotification({
        userId: updated.clientID,
        type: 'custom-quote-ready',
        title: 'Your quote is ready',
        message: `Your quote for "${updated.title || 'your custom piece'}" is ready to review.`,
        channels: ['inApp', 'email'],
        recipientEmail: updated.customerEmail,
        priority: 'high',
        data: { actionUrl: PORTAL_URL, customID },
      });
    }
  } catch (e) {
    console.error('⚠️ custom-quote-ready notification failed:', e.message);
  }

  // X2 — milestone status change: notify the client on the mapped milestone transitions only
  // (skip cosmetic/no-op writes — fire only when status actually changed value).
  try {
    const statusChanged = updated.status && existing?.status !== updated.status;
    const milestone = statusChanged ? CUSTOM_STATUS_NOTIFICATIONS[updated.status] : null;
    if (milestone && updated.clientID) {
      await NotificationService.createNotification({
        userId: updated.clientID,
        type: `custom-status-${updated.status}`,
        title: milestone.title,
        message: milestone.message,
        channels: ['inApp', 'email'],
        recipientEmail: updated.customerEmail,
        priority: 'normal',
        data: { actionUrl: PORTAL_URL, customID, status: updated.status },
      });
    }
  } catch (e) {
    console.error('⚠️ custom-status notification failed:', e.message);
  }

  return NextResponse.json(updated, { status: 200 });
};
