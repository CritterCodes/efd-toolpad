import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOpsAny } from '@/lib/apiAuth';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';
import { adminLink } from '@/lib/appUrls';

/**
 * The staff Shipping & Delivery desk (owner, 2026-09-04: the per-wholesaler profile panel was
 * "remarkably annoying to reach" — outbound coordination needs ONE page). Everything outbound,
 * grouped per account:
 *
 *   ready      invoiced work not yet in a box — pick invoices, then ship (carrier + tracking)
 *              or schedule a hand delivery (both via POST /api/wholesale/repairs/ship-back)
 *   scheduled  hand deliveries planned but not yet dropped off (Mark delivered lives here)
 *   recent     packages shipped or delivered in the last 30 days
 */

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const invoiceRow = (inv) => ({
  invoiceID: inv.invoiceID,
  createdAt: inv.createdAt,
  status: inv.status,
  paymentStatus: inv.paymentStatus,
  total: inv.total,
  remainingBalance: inv.remainingBalance,
  repairCount: (inv.repairIDs || []).length,
  outboundShipment: inv.outboundShipment || null,
});

/** Group invoices per account; carry the display name off the newest invoice. */
function groupByAccount(invoices) {
  const groups = new Map();
  for (const inv of invoices) {
    const key = inv.accountID || `wholesale-client:${inv.clientID || inv.invoiceID}`;
    if (!groups.has(key)) {
      groups.set(key, { accountID: key, customerName: inv.customerName || '', invoices: [] });
    }
    const group = groups.get(key);
    if (!group.customerName && inv.customerName) group.customerName = inv.customerName;
    group.invoices.push(invoiceRow(inv));
  }
  return [...groups.values()].map((group) => ({
    ...group,
    total: round2(group.invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)),
    repairCount: group.invoices.reduce((sum, inv) => sum + inv.repairCount, 0),
  }));
}

export async function GET() {
  const { errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
  if (errorResponse) return errorResponse;

  try {
    const dbi = await db.connect();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [readyInvoices, scheduledInvoices, recentInvoices] = await Promise.all([
      // The picker across EVERY account: invoiced (payment is not the shipping gate),
      // carrying repairs, not already in a box.
      dbi.collection('repairInvoices').find({
        accountType: 'wholesale',
        status: { $in: ['open', 'paid'] },
        'repairIDs.0': { $exists: true },
        outboundShipment: { $exists: false },
      }).sort({ createdAt: 1 }).toArray(),
      dbi.collection('repairInvoices').find({
        accountType: 'wholesale',
        'outboundShipment.method': 'delivery',
        'outboundShipment.deliveredAt': { $exists: false },
      }).sort({ 'outboundShipment.scheduledFor': 1 }).toArray(),
      dbi.collection('repairInvoices').find({
        accountType: 'wholesale',
        $or: [
          { 'outboundShipment.shippedAt': { $gte: thirtyDaysAgo }, 'outboundShipment.method': { $ne: 'delivery' } },
          { 'outboundShipment.deliveredAt': { $gte: thirtyDaysAgo } },
        ],
      }).sort({ 'outboundShipment.shippedAt': -1 }).limit(100).toArray(),
    ]);

    // Resolve a portal login per ready account when one exists (the wholesaler-profile link);
    // an admin-created account without a login still ships fine — everything else is
    // account-keyed. One users read covers all groups.
    const ready = groupByAccount(readyInvoices);
    if (ready.length) {
      try {
        const wholesalers = await dbi.collection('users')
          .find({ role: 'wholesaler' }, { projection: { _id: 0, userID: 1, business: 1, 'wholesaleApplication.businessName': 1 } })
          .toArray();
        const byBusinessKey = new Map();
        for (const user of wholesalers) {
          for (const name of [user.business, user.wholesaleApplication?.businessName]) {
            const key = normalizeAccountKey(name);
            if (key && !byBusinessKey.has(key)) byBusinessKey.set(key, user.userID);
          }
        }
        for (const group of ready) {
          const businessKey = group.accountID.startsWith('wholesale-business:')
            ? group.accountID.slice('wholesale-business:'.length)
            : '';
          group.wholesalerUserID = byBusinessKey.get(businessKey) || '';
        }
      } catch (e) {
        console.error('shipping overview: wholesaler login resolution failed:', e?.message);
      }
    }

    return NextResponse.json({
      success: true,
      ready,
      scheduled: groupByAccount(scheduledInvoices),
      recent: groupByAccount(recentInvoices),
    });
  } catch (error) {
    console.error('GET /api/wholesale/shipping error:', error);
    return NextResponse.json({ error: 'Could not load the shipping overview.' }, { status: 500 });
  }
}

/**
 * POST { action: 'mark-delivered', invoiceIDs } — the box was handed to the store. Stamps
 * deliveredAt on the invoices' and repairs' outboundShipment (dot-path $set — the shipment
 * subdocument must not be replaced) and tells the partner it arrived.
 */
export async function POST(request) {
  try {
    const { errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'mark-delivered') {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }
    const invoiceIDs = Array.isArray(body.invoiceIDs) ? body.invoiceIDs.filter(Boolean) : [];
    if (invoiceIDs.length === 0) {
      return NextResponse.json({ error: 'invoiceIDs array is required.' }, { status: 400 });
    }

    const dbi = await db.connect();
    const now = new Date();

    const invoices = await dbi.collection('repairInvoices')
      .find({
        invoiceID: { $in: invoiceIDs },
        accountType: 'wholesale',
        'outboundShipment.method': 'delivery',
        'outboundShipment.deliveredAt': { $exists: false },
      })
      .toArray();
    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No matching scheduled deliveries found.' }, { status: 404 });
    }

    const deliverable = invoices.map((inv) => inv.invoiceID);
    const repairIDs = [...new Set(invoices.flatMap((inv) => inv.repairIDs || []))];

    await dbi.collection('repairInvoices').updateMany(
      { invoiceID: { $in: deliverable } },
      { $set: { 'outboundShipment.deliveredAt': now, updatedAt: now } },
    );
    if (repairIDs.length) {
      await dbi.collection('repairs').updateMany(
        { repairID: { $in: repairIDs }, 'outboundShipment.method': 'delivery' },
        { $set: { 'outboundShipment.deliveredAt': now, updatedAt: now } },
      );
    }

    // Best-effort arrival note, per portal account (same recipient rules as ship-back).
    const byRecipient = new Map();
    for (const inv of invoices) {
      let recipients = [];
      try {
        recipients = await resolveWholesaleInvoiceRecipients(inv);
      } catch (e) {
        console.error('mark-delivered recipient resolution failed:', e?.message);
      }
      for (const user of recipients) {
        if (!byRecipient.has(user.userID)) byRecipient.set(user.userID, { user, ids: [] });
        byRecipient.get(user.userID).ids.push(inv.invoiceID);
      }
    }
    for (const { user, ids } of byRecipient.values()) {
      NotificationService.createNotification({
        userId: user.userID,
        recipientEmail: user.email || '',
        type: 'wholesale-shipped-back',
        title: 'Your repairs were delivered',
        message: `We delivered ${ids.length} invoice(s) to your store today: ${ids.join(', ')}.`,
        channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
        priority: 'normal',
        tags: ['wholesale', 'shipping'],
        data: {
          invoiceIDs: ids,
          ...(user.firstName || user.business ? { recipientName: user.firstName || user.business } : {}),
          actionUrl: adminLink('/dashboard/wholesaler/shipments'),
          actionLabel: 'View Shipments',
        },
      }).catch((e) => console.error('mark-delivered notification failed:', e?.message));
    }

    return NextResponse.json({
      success: true,
      delivered: deliverable.length,
      message: `${deliverable.length} invoice(s) marked delivered.`,
    });
  } catch (error) {
    console.error('POST /api/wholesale/shipping error:', error);
    return NextResponse.json({ error: 'Could not mark the delivery.' }, { status: 500 });
  }
}
