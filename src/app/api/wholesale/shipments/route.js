import { NextResponse } from 'next/server';
import { requireRole, isStaffRepairSession } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { buildShipments } from '@/services/wholesale/shipments';

/**
 * GET /api/wholesale/shipments — the caller's packages, both directions,
 * grouped by tracking number. Wholesalers see their own; staff may pass
 * ?wholesalerId= to see an account's (the admin profile reuses this).
 */
export async function GET(request) {
  const { session, errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const staff = isStaffRepairSession(session);
    const wholesalerId = staff
      ? (searchParams.get('wholesalerId') || '')
      : session.user.userID;
    if (!wholesalerId) return NextResponse.json({ error: 'wholesalerId is required' }, { status: 400 });

    const dbi = await db.connect();

    // Inbound: repairs they own or created, that were handed to a carrier.
    const repairs = await dbi.collection('repairs')
      .find(
        {
          isWholesale: true,
          $or: [{ userID: wholesalerId }, { createdBy: wholesalerId }],
          'inboundShipment.trackingNumber': { $exists: true },
        },
        { projection: { _id: 0, repairID: 1, description: 1, status: 1, receivedAt: 1, inboundShipment: 1 } },
      )
      .toArray();

    // Outbound: their invoices with a return shipment — same identity rule as
    // Billing (userID, or the business account key for admin-created repairs).
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
    const invoices = await dbi.collection('repairInvoices')
      .find(
        {
          accountType: 'wholesale',
          'outboundShipment.trackingNumber': { $exists: true },
          $or: [
            { clientID: wholesalerId },
            { storeId: wholesalerId },
            ...(accountIds.length ? [{ accountID: { $in: accountIds } }] : []),
          ],
        },
        { projection: { _id: 0, invoiceID: 1, total: 1, paymentStatus: 1, repairIDs: 1, 'repairSnapshots.repairID': 1, 'repairSnapshots.description': 1, outboundShipment: 1 } },
      )
      .toArray();

    return NextResponse.json({ success: true, shipments: buildShipments({ repairs, invoices }) });
  } catch (error) {
    console.error('GET /api/wholesale/shipments error:', error);
    return NextResponse.json({ error: 'Could not load shipments.' }, { status: 500 });
  }
}
