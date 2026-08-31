import { NextResponse } from 'next/server';
import { requireRole, isStaffRepairSession } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * GET /api/wholesale/invoices — a wholesaler's own billing: their invoices and
 * the open balance across them.
 *
 * The records have existed all along (`repairInvoices`, accountType 'wholesale',
 * grouped per business at closeout) but were reachable only through the staff
 * closeout API — a partner could never see what they owe. This is the read side;
 * paying online is a later, deliberate build (card fees are a pricing decision).
 *
 * SCOPING: an invoice belongs to this wholesaler when its `clientID` is their
 * userID (repairs they own) OR its `accountID` is their business key — admin
 * sometimes creates wholesale repairs on behalf of a store, and those invoices
 * carry the business identity rather than the wholesaler's user id.
 *
 * Drafts are invisible here (not issued yet — a number that may still change is
 * not a bill), voids are invisible (not owed). Snapshots are projected down to
 * repairID + description; closeout notes and internal figures never cross.
 */
export async function GET() {
  const { session, errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const dbi = await db.connect();
    const filter = { accountType: 'wholesale', status: { $in: ['open', 'paid'] } };

    if (!isStaffRepairSession(session)) {
      const userID = session.user.userID || '__no_user__';
      const me = await dbi.collection('users').findOne(
        { userID },
        { projection: { _id: 0, business: 1, 'wholesaleApplication.businessName': 1 } },
      );
      const accountIds = [...new Set(
        [me?.business, me?.wholesaleApplication?.businessName]
          .map(normalizeAccountKey)
          .filter(Boolean)
          .map((key) => `wholesale-business:${key}`),
      )];
      filter.$or = [
        { clientID: userID },
        { storeId: userID },
        ...(accountIds.length ? [{ accountID: { $in: accountIds } }] : []),
      ];
    }

    const invoices = await dbi.collection('repairInvoices')
      .find(filter, {
        projection: {
          _id: 0,
          invoiceID: 1, createdAt: 1, paidAt: 1,
          status: 1, paymentStatus: 1, deliveryMethod: 1,
          subtotal: 1, taxAmount: 1, deliveryFee: 1, cashDiscountAmount: 1, pendingCheckout: 1,
          total: 1, amountPaid: 1, remainingBalance: 1,
          repairIDs: 1, 'repairSnapshots.repairID': 1, 'repairSnapshots.description': 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    // The number the page leads with: what is owed right now, across open invoices.
    const openBalance = round2(
      invoices
        .filter((inv) => inv.status === 'open' && inv.paymentStatus !== 'paid')
        .reduce((sum, inv) => sum + (Number(inv.remainingBalance) || 0), 0),
    );

    return NextResponse.json({
      success: true,
      openBalance,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error('GET /api/wholesale/invoices error:', error);
    return NextResponse.json({ error: 'Could not load your invoices.' }, { status: 500 });
  }
}
