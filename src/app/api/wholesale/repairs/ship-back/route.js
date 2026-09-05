import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOpsAny } from '@/lib/apiAuth';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { REPAIR_STATUS, normalizeRepairStatus } from '@/services/repairWorkflow';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';
import { adminLink } from '@/lib/appUrls';

/**
 * Return shipping for remote wholesalers, organized around INVOICES (owner,
 * 2026-09-01): "shipback should be based off the invoice — if the jobs aren't
 * done they wouldn't be invoiced and not available for shipback. We reserve the
 * right to ship back multiple invoices in one package — that gives us the
 * transfer list."
 *
 * Invoicing happens at closeout, so "invoiced" IS the done-gate. This also
 * fixes a real hole in the repair-status version: paying an invoice moves its
 * repairs to PAID_CLOSED, which the old COMPLETED-only gate would have refused
 * to ship — the paid box was the unshippable one.
 *
 * One package = N invoices = one tracking number. The response is the shipment
 * manifest (per-invoice repair lists) — the transfer list that rides in the box.
 */

const SHIPPABLE_REPAIR_STATUSES = [
  REPAIR_STATUS.COMPLETED,
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
  REPAIR_STATUS.PAID_CLOSED,
];

/** All invoice-identity keys for a wholesaler (userID + business account keys). */
async function accountFilterFor(dbi, wholesalerId) {
  const me = await dbi.collection('users').findOne(
    { userID: wholesalerId },
    { projection: { _id: 0, business: 1, 'wholesaleApplication.businessName': 1 } },
  );
  const accountIds = [...new Set(
    [me?.business, me?.wholesaleApplication?.businessName]
      .map(normalizeAccountKey)
      .filter(Boolean)
      .map((key) => `wholesale-business:${key}`),
  )];
  return {
    accountType: 'wholesale',
    $or: [
      { clientID: wholesalerId },
      { storeId: wholesalerId },
      ...(accountIds.length ? [{ accountID: { $in: accountIds } }] : []),
    ],
  };
}

const invoiceRow = (inv) => ({
  invoiceID: inv.invoiceID,
  createdAt: inv.createdAt,
  status: inv.status,
  paymentStatus: inv.paymentStatus,
  total: inv.total,
  remainingBalance: inv.remainingBalance,
  repairs: (inv.repairSnapshots || []).map((r) => ({ repairID: r.repairID, description: r.description || '' })),
  repairIDs: inv.repairIDs || [],
  outboundShipment: inv.outboundShipment || null,
});

/**
 * GET ?wholesalerId=X            → invoices with repairs not yet shipped (the picker)
 * GET ?wholesalerId=X&invoices=a,b → those invoices regardless of shipped state
 *                                   (the transfer-list page re-reads after shipping)
 * GET ?account=<accountID>       → same, keyed by the invoice's account directly — the
 *                                   Shipping & Delivery page works per ACCOUNT, and an
 *                                   admin-created account may have no portal login to key on.
 */
export async function GET(request) {
  const { errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const wholesalerId = searchParams.get('wholesalerId');
    const account = searchParams.get('account');
    if (!wholesalerId && !account) {
      return NextResponse.json({ error: 'wholesalerId or account is required' }, { status: 400 });
    }

    const dbi = await db.connect();
    const filter = account
      ? { accountType: 'wholesale', accountID: account }
      : await accountFilterFor(dbi, wholesalerId);

    const wanted = String(searchParams.get('invoices') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (wanted.length) {
      filter.invoiceID = { $in: wanted };
    } else {
      // The picker: invoiced (open OR paid — payment is not the shipping gate),
      // carrying repairs, and not already in a box.
      filter.status = { $in: ['open', 'paid'] };
      filter['repairIDs.0'] = { $exists: true };
      filter.outboundShipment = { $exists: false };
    }

    const invoices = await dbi.collection('repairInvoices').find(filter).sort({ createdAt: 1 }).toArray();
    return NextResponse.json({ success: true, invoices: invoices.map(invoiceRow) });
  } catch (error) {
    console.error('GET /api/wholesale/repairs/ship-back error:', error);
    return NextResponse.json({ error: 'Could not load shippable invoices' }, { status: 500 });
  }
}

/**
 * POST { invoiceIDs, carrier?, trackingNumber }                — ship N invoices as one package.
 * POST { invoiceIDs, method: 'deliver', scheduledFor }         — WE hand-deliver the package to
 *   the store on a date; no carrier or tracking exists. The partner is told the date instead
 *   of a tracking number, and the Shipping & Delivery page carries it until Mark delivered.
 */
export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
    if (errorResponse) return errorResponse;

    const { invoiceIDs, carrier, trackingNumber, method, scheduledFor } = await request.json();

    if (!Array.isArray(invoiceIDs) || invoiceIDs.length === 0) {
      return NextResponse.json({ error: 'invoiceIDs array is required — ship-back is invoice-based (only invoiced work is done work).' }, { status: 400 });
    }

    const isDelivery = method === 'deliver';
    const tracking = String(trackingNumber || '').trim();
    let deliveryDate = null;
    if (isDelivery) {
      deliveryDate = scheduledFor ? new Date(scheduledFor) : null;
      if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) {
        return NextResponse.json({ error: 'scheduledFor (a valid date) is required for a hand delivery.' }, { status: 400 });
      }
    } else if (!tracking) {
      return NextResponse.json({ error: 'trackingNumber is required — an untracked return shipment is a lost-box dispute waiting to happen' }, { status: 400 });
    }
    const shipCarrier = String(carrier || '').trim() || null;

    const dbi = await db.connect();
    const now = new Date();

    const invoices = await dbi.collection('repairInvoices')
      .find({ invoiceID: { $in: invoiceIDs }, accountType: 'wholesale' })
      .toArray();

    const shippable = [];
    const refused = [];
    for (const id of invoiceIDs) {
      const inv = invoices.find((x) => x.invoiceID === id);
      if (!inv) { refused.push({ invoiceID: id, reason: 'not found or not a wholesale invoice' }); continue; }
      if (inv.outboundShipment) { refused.push({ invoiceID: id, reason: `already ${inv.outboundShipment.method === 'delivery' ? 'scheduled for delivery' : `shipped (${inv.outboundShipment.trackingNumber})`}` }); continue; }
      if (!(inv.repairIDs || []).length) { refused.push({ invoiceID: id, reason: 'carries no repairs' }); continue; }
      if (!['open', 'paid'].includes(inv.status)) { refused.push({ invoiceID: id, reason: `status is ${inv.status}` }); continue; }
      shippable.push(inv);
    }

    if (shippable.length) {
      const allRepairIDs = [...new Set(shippable.flatMap((inv) => inv.repairIDs || []))];

      // Sanity: everything invoiced should be finished, but a legacy repair in a
      // working state must not silently leave the shop.
      const repairs = await dbi.collection('repairs')
        .find({ repairID: { $in: allRepairIDs } }, { projection: { _id: 0, repairID: 1, status: 1 } })
        .toArray();
      const unfinished = repairs.filter((r) => !SHIPPABLE_REPAIR_STATUSES.includes(normalizeRepairStatus(r.status)));
      if (unfinished.length) {
        return NextResponse.json({
          error: `Invoiced repairs are not in a shippable state: ${unfinished.map((r) => `${r.repairID} (${r.status})`).join(', ')}`,
        }, { status: 409 });
      }

      const shipment = isDelivery
        ? {
            method: 'delivery',
            scheduledFor: deliveryDate,
            shippedAt: now,
            shippedBy: session.user.userID,
          }
        : {
            method: 'ship',
            carrier: shipCarrier,
            trackingNumber: tracking,
            shippedAt: now,
            shippedBy: session.user.userID,
          };

      // Move only pre-payment statuses to DELIVERY BATCHED; a PAID_CLOSED repair
      // keeps its closed status (shipping must never regress the money state).
      await dbi.collection('repairs').updateMany(
        { repairID: { $in: allRepairIDs }, status: { $in: [REPAIR_STATUS.COMPLETED, REPAIR_STATUS.READY_FOR_PICKUP] } },
        { $set: { status: REPAIR_STATUS.DELIVERY_BATCHED, updatedAt: now } },
      );
      await dbi.collection('repairs').updateMany(
        { repairID: { $in: allRepairIDs } },
        { $set: { deliveryMethod: 'ship', outboundShipment: shipment, updatedAt: now } },
      );
      await dbi.collection('repairInvoices').updateMany(
        { invoiceID: { $in: shippable.map((inv) => inv.invoiceID) } },
        { $set: { outboundShipment: shipment, deliveryMethod: 'ship', updatedAt: now } },
      );

      // One notification per PORTAL ACCOUNT. Grouping by invoice.clientID looked right but
      // notified nobody on admin-created invoices — clientID there is a client RECORD id, not
      // a login — and it never carried a recipient email, so the email leg failed on every
      // send. Resolve the same identities the partner portal uses (clientID/storeId by
      // userID, business account key), which also greets them by name.
      const byRecipient = new Map();
      for (const inv of shippable) {
        let recipients = [];
        try {
          recipients = await resolveWholesaleInvoiceRecipients(inv);
        } catch (e) {
          console.error('ship-back recipient resolution failed:', e?.message);
        }
        for (const user of recipients) {
          if (!byRecipient.has(user.userID)) byRecipient.set(user.userID, { user, ids: [] });
          byRecipient.get(user.userID).ids.push(inv.invoiceID);
        }
      }
      const deliveryDateLabel = isDelivery
        ? deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : '';
      for (const { user, ids } of byRecipient.values()) {
        NotificationService.createNotification({
          userId: user.userID,
          recipientEmail: user.email || '',
          type: 'wholesale-shipped-back',
          title: isDelivery ? 'Your repairs are being delivered' : 'Your repairs are on the way back',
          message: isDelivery
            ? `We're hand-delivering ${ids.length} invoice(s) to your store on ${deliveryDateLabel}: ${ids.join(', ')}.`
            : `${ids.length} invoice(s) shipped back to you${shipCarrier ? ` via ${shipCarrier}` : ''}: ${ids.join(', ')}. Tracking: ${tracking}`,
          channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
          priority: 'high',
          tags: ['wholesale', 'shipping'],
          data: {
            carrier: shipCarrier,
            trackingNumber: isDelivery ? '' : tracking,
            ...(isDelivery ? { scheduledFor: deliveryDate.toISOString() } : {}),
            invoiceIDs: ids,
            ...(user.firstName || user.business ? { recipientName: user.firstName || user.business } : {}),
            // Absolute — this URL rides in an email, where a relative href is inert.
            actionUrl: adminLink('/dashboard/wholesaler/shipments'),
            actionLabel: 'View Shipment',
          },
        }).catch((e) => console.error('ship-back notification failed:', e?.message));
      }
    }

    return NextResponse.json({
      success: true,
      shipped: shippable.length,
      refused,
      // The transfer list: what is physically in this box, by invoice.
      manifest: {
        method: isDelivery ? 'delivery' : 'ship',
        carrier: shipCarrier,
        trackingNumber: isDelivery ? '' : tracking,
        scheduledFor: isDelivery ? deliveryDate : null,
        shippedAt: now,
        invoices: shippable.map(invoiceRow),
      },
      message: refused.length
        ? `${shippable.length} invoice(s) ${isDelivery ? 'scheduled' : 'shipped'}; ${refused.length} refused (see refused list).`
        : (isDelivery
          ? `${shippable.length} invoice(s) scheduled for delivery.`
          : `${shippable.length} invoice(s) shipped with tracking ${tracking}.`),
    });
  } catch (error) {
    console.error('POST /api/wholesale/repairs/ship-back error:', error);
    return NextResponse.json({ error: 'Failed to record the return shipment' }, { status: 500 });
  }
}
