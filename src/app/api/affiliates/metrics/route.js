import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

// GET /api/affiliates/metrics?affiliateId=
export async function GET(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  let affiliateId = searchParams.get('affiliateId');

  // Non-admins can only see their own metrics
  if (!isAdminOrDev(session.user.role)) {
    const affiliatesCol = await db.dbAffiliates();
    const affiliate = await affiliatesCol.findOne({ userId: session.user.userID });
    if (!affiliate) {
      return NextResponse.json({ success: true, data: { clicks: 0, uniqueClicks: 0, requests: 0, referredUserIds: [] } });
    }
    affiliateId = affiliate.affiliateId;
  }

  if (!affiliateId) {
    return NextResponse.json({ success: false, error: 'affiliateId is required.' }, { status: 400 });
  }

  const eventsCol = await db.dbAffiliateReferralEvents();
  const [clicks, convertedEvents] = await Promise.all([
    eventsCol.countDocuments({ affiliateId }),
    eventsCol.find({ affiliateId, converted: true }, { projection: { conversionId: 1, _id: 0 } }).toArray(),
  ]);

  const ticketsCol = await db.dbCustomTickets();
  const referredTickets = convertedEvents.length
    ? await ticketsCol
        .find(
          { ticketID: { $in: convertedEvents.map((e) => e.conversionId) } },
          { projection: { userID: 1, _id: 0 } }
        )
        .toArray()
    : [];

  const referredUserIds = [...new Set(referredTickets.map((t) => t.userID).filter(Boolean))];

  return NextResponse.json({
    success: true,
    data: {
      clicks,
      requests: convertedEvents.length,
      referredUserIds,
      referredClientsCount: referredUserIds.length,
    },
  });
}
