import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { listCommissions, listPendingWork } from '@/services/affiliates/commissionEngine';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

// GET /api/affiliates/commissions?affiliateId= — the earnings ledger.
// Admins may scope to any affiliate; everyone else sees ONLY their own, regardless
// of what affiliateId they pass (same ownership rule as the campaigns list).
export async function GET(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  let affiliateId = searchParams.get('affiliateId');

  if (!isAdminOrDev(session.user.role)) {
    const affiliatesCol = await db.dbAffiliates();
    const affiliate = await affiliatesCol.findOne({ userId: session.user.userID });
    if (!affiliate) return NextResponse.json({ success: true, data: { commissions: [], totals: { earned: 0, pendingReview: 0, entries: 0 } } });
    if (affiliateId && affiliateId !== affiliate.affiliateId) {
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }
    affiliateId = affiliate.affiliateId;
  }

  if (!affiliateId) {
    return NextResponse.json({ success: false, error: 'affiliateId is required.' }, { status: 400 });
  }

  // Ledger + referred work that hasn't earned yet, so the dashboard can show what's
  // coming instead of a bare $0 while a referred piece is still being made.
  const [data, pending] = await Promise.all([
    listCommissions(affiliateId),
    listPendingWork(affiliateId).catch((e) => {
      console.error('[affiliates] pending work lookup failed:', e.message);
      return { rows: [], estimatedTotal: 0, count: 0 };
    }),
  ]);
  return NextResponse.json({ success: true, data: { ...data, pending } });
}
