/**
 * Custom-order status automation — the ONE forward-only advance path.
 *
 * Lifecycle events (quote published, CAD assigned, payment thresholds, casting
 * received, bench QC) advance the order's status through here rather than each
 * writing `status` themselves. Forward-only against STATUS_RANK, so automation
 * can never demote an order a human moved ahead, a stale event replaying late
 * is a no-op, and a cancelled order (rank 99) is never resurrected.
 *
 * The manual PUT route keeps its own write (a human may deliberately move an
 * order BACKWARD); it shares the milestone-notification map below so customers
 * hear the same words either way.
 */
import CustomOrdersModel, { CUSTOM_ORDER_STATUS } from '@/app/api/custom-orders/model';
import { NotificationService } from '@/lib/notificationService';
import { portalLink } from '@/lib/appUrls';
import { DISCIPLINE } from '@/services/workOrders/disciplines';

export const STATUS_RANK = {
  pending: 0, consultation: 1, design: 2, quote: 3, deposit: 4,
  in_production: 5, qc: 6, completed: 7, delivered: 8, cancelled: 99,
};

// Milestone statuses that warrant a customer notification, with friendly copy.
// Cosmetic / intermediate transitions (pending, consultation, quote, deposit) are
// skipped — quote/deposit already produce their own richer notifications.
export const CUSTOM_STATUS_NOTIFICATIONS = {
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

/** Fire the mapped milestone notification for a status the order just entered. Best-effort. */
export async function notifyStatusMilestone(order, status) {
  const milestone = CUSTOM_STATUS_NOTIFICATIONS[status];
  if (!milestone || !order?.clientID) return;
  try {
    await NotificationService.createNotification({
      userId: order.clientID,
      type: `custom-status-${status}`,
      title: milestone.title,
      message: milestone.message,
      channels: ['inApp', 'email'],
      recipientEmail: order.customerEmail,
      priority: 'normal',
      data: { actionUrl: portalLink(order.customID, 'overview'), customID: order.customID, status },
    });
  } catch (e) {
    console.error('⚠️ custom-status notification failed:', e.message);
  }
}

/**
 * Advance an order to `target` if that is forward motion; otherwise leave it alone.
 * Returns { advanced, order }. On crossing into `completed` it also awards the
 * client-management bonus (C8) — idempotent, and best-effort so a bonus failure
 * never rolls back a status the shop floor already earned.
 */
export async function advanceCustomOrderStatus(customID, target, { reason = '', changedBy = 'system', order = null } = {}) {
  const existing = order || await CustomOrdersModel.findById(customID);
  if (!existing) return { advanced: false, order: null };
  if ((STATUS_RANK[existing.status] ?? 0) >= (STATUS_RANK[target] ?? 0)) {
    return { advanced: false, order: existing };
  }

  let updated = await CustomOrdersModel.updateById(customID, { status: target }, { changedBy, reason });

  if (target === CUSTOM_ORDER_STATUS.COMPLETED) {
    try {
      // Lazy import: customProduction imports this module for its own hooks.
      const { awardClientMgmtBonus } = await import('@/services/customs/customProduction');
      await awardClientMgmtBonus({ customID });
      updated = await CustomOrdersModel.findById(customID);
    } catch (e) {
      console.error('Client-management bonus award failed:', e.message);
    }
  }

  await notifyStatusMilestone(updated, target);
  return { advanced: true, order: updated };
}

/**
 * Advance to `completed` when the LAST work order finishes — but only once the
 * order is genuinely in the make phase. The guard matters because CAD QC passes
 * months before the bench works: right after design approval the order's ONLY
 * work order is the CAD one, so "all work orders completed" is trivially true.
 * Requiring casting-in-hand (or a status already at/past in_production) plus at
 * least one completed non-CAD work order pins "done" to actual bench work.
 */
export async function maybeCompleteCustomOrder(customID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return { advanced: false, order: null };
  if ((STATUS_RANK[order.status] ?? 0) >= STATUS_RANK.completed) return { advanced: false, order };
  if (!order.castingReceivedAt && (STATUS_RANK[order.status] ?? 0) < STATUS_RANK.in_production) {
    return { advanced: false, order };
  }

  const { getCustomWorkOrders } = await import('@/services/customs/customProduction');
  const wos = await getCustomWorkOrders(customID);
  const isTerminal = (s) => ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(String(s || '').toUpperCase());
  const benchDone = wos.some((w) => w.discipline !== DISCIPLINE.CAD && String(w.status || '').toUpperCase() === 'COMPLETED');
  if (!wos.length || !benchDone || !wos.every((w) => isTerminal(w.status))) {
    return { advanced: false, order };
  }

  return advanceCustomOrderStatus(customID, CUSTOM_ORDER_STATUS.COMPLETED, {
    reason: 'all work orders completed', order,
  });
}
