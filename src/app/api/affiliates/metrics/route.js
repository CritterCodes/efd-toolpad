import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

/** Privacy-mask a referred client for the AFFILIATE's eyes: first name + last initial,
 *  two-character email stub. The full document never leaves the server — the old page
 *  fetched whole user records and masked them in the browser, which masked nothing. */
function maskClient(user) {
  const email = String(user.email || '');
  const [local, domain] = email.split('@');
  return {
    userID: user.userID,
    name: `${user.firstName || ''} ${user.lastName ? `${user.lastName[0]}.` : ''}`.trim() || '—',
    maskedEmail: local && domain ? `${local.slice(0, 2)}***@${domain}` : '—',
    memberSince: user.createdAt || null,
  };
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
      return NextResponse.json({ success: true, data: { clicks: 0, requests: 0, referredUserIds: [], referredClients: [], referredClientsCount: 0 } });
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
  const conversionIds = convertedEvents.map((e) => e.conversionId).filter(Boolean);

  // Conversions live on customOrders (the shop stamps conversionId = customID). This
  // route joined against customTickets — the RETIRED collection — so every conversion
  // since the cutover resolved to zero referred clients. Legacy tickets are still
  // queried second, so pre-cutover conversions keep counting.
  let referredUserIds = [];
  if (conversionIds.length) {
    const ordersCol = await db.dbCustomOrders();
    const orders = await ordersCol
      .find({ customID: { $in: conversionIds } }, { projection: { _id: 0, clientID: 1 } })
      .toArray();
    const ticketsCol = await db.dbCustomTickets();
    const legacyTickets = await ticketsCol
      .find({ ticketID: { $in: conversionIds } }, { projection: { _id: 0, userID: 1 } })
      .toArray();
    referredUserIds = [...new Set([
      ...orders.map((o) => o.clientID),
      ...legacyTickets.map((t) => t.userID),
    ].filter(Boolean))];
  }

  // Resolve the referred clients server-side, masked. Affiliates lost direct access to
  // /api/users (any login could dump the client base through it); this hands them exactly
  // the four fields the referred-clients table shows and nothing more.
  let referredClients = [];
  if (referredUserIds.length) {
    const usersCol = await db.dbUsers();
    const users = await usersCol
      .find(
        { userID: { $in: referredUserIds.slice(0, 100) } },
        { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1, createdAt: 1 } },
      )
      .toArray();
    referredClients = users.map(maskClient);
  }

  return NextResponse.json({
    success: true,
    data: {
      clicks,
      requests: convertedEvents.length,
      referredUserIds,
      referredClients,
      referredClientsCount: referredUserIds.length,
    },
  });
}
