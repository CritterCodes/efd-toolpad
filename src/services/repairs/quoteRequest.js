/**
 * "Request Quote" on a wholesale repair (owner, 2026-09-21).
 *
 * The push is for stores to enter and price their own jobs (Create Repair + smart intake). When a
 * store can't price something, they create the repair as usual and click Request Quote instead of
 * Save: the repair is created with NO tasks and `quoteRequest.status = 'requested'`. The physical
 * flow is unchanged — the piece still comes in by pickup / drop-off / FedEx — but the shop sees a
 * "needs quote" flag on the pending-wholesale board and the repair page. When staff price it (edit
 * the repair, add tasks; the total goes above zero) the request flips to 'quoted' and the store is
 * told the number. No separate approval step in v1: the store approves by sending the piece, and
 * can reply if they don't.
 *
 * Kept OFF `repair.quote` on purpose — that object is the retail lead-quote lifecycle
 * (drafted / sent / accepted) and every board renders it that way.
 */
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { adminLink } from '@/lib/appUrls';

export const QUOTE_REQUEST_STATUS = Object.freeze({ REQUESTED: 'requested', QUOTED: 'quoted' });

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** The block stamped on a repair created with Request Quote. Pure. */
export function buildQuoteRequest({ actor = {}, now = new Date() } = {}) {
  return {
    status: QUOTE_REQUEST_STATUS.REQUESTED,
    requestedAt: now,
    requestedBy: actor.userID || '',
    requestedByName: actor.name || '',
    quotedAt: null,
    quotedTotal: null,
    notifiedAt: null,
  };
}

export function isQuoteRequested(repair) {
  return repair?.quoteRequest?.status === QUOTE_REQUEST_STATUS.REQUESTED;
}

/**
 * Did this update PRICE a requested quote? True when the repair was awaiting a quote and now
 * carries a total above zero. Pure.
 */
export function shouldMarkQuoteReady(existingRepair, updatedRepair) {
  if (!isQuoteRequested(existingRepair)) return false;
  return round2(updatedRepair?.totalCost) > 0;
}

/** The $set that closes the request with the quoted number. Pure. */
export function buildQuoteReadyUpdate(existingRepair, updatedRepair, { now = new Date() } = {}) {
  return {
    quoteRequest: {
      ...(existingRepair?.quoteRequest || {}),
      status: QUOTE_REQUEST_STATUS.QUOTED,
      quotedAt: now,
      quotedTotal: round2(updatedRepair?.totalCost),
    },
  };
}

/** Recipients for a wholesale repair — same identity rules the invoice notifications use. */
export async function resolveWholesaleRepairRecipients(repair) {
  const key = normalizeAccountKey(repair?.businessName || repair?.storeName || '');
  return resolveWholesaleInvoiceRecipients({
    storeId: repair?.storeId || '',
    clientID: repair?.createdBy || '',
    accountID: key ? `wholesale-business:${key}` : '',
  });
}

/** Tell the store their quote is ready. Best-effort; returns a delivery summary. */
export async function notifyQuoteReady(repair) {
  const summary = { notified: 0, recipients: [] };
  try {
    const recipients = await resolveWholesaleRepairRecipients(repair);
    const total = round2(repair?.totalCost);
    for (const user of recipients) {
      await NotificationService.createNotification({
        userId: user.userID,
        recipientEmail: user.email || '',
        type: 'wholesale-quote-ready',
        title: 'Your repair quote is ready',
        message: `Repair ${repair.repairID}${repair.clientName ? ` (${repair.clientName})` : ''}: $${total.toFixed(2)}. Send the piece in as usual to go ahead, or reply if you have questions.`,
        channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
        priority: 'normal',
        tags: ['wholesale', 'quote'],
        data: {
          repairID: repair.repairID, quotedTotal: total, relatedType: 'repair', userRole: 'wholesaler',
          ...(user.firstName || user.business ? { recipientName: user.firstName || user.business } : {}),
          actionUrl: adminLink(`/dashboard/repairs/${repair.repairID}`), actionLabel: 'View repair',
        },
      });
      summary.notified += 1;
      summary.recipients.push(user.email || user.userID);
    }
  } catch (e) {
    console.error('quote-ready notification failed (non-fatal):', e?.message);
  }
  return summary;
}
