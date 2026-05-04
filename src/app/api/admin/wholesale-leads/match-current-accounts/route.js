import { requireRole } from '@/lib/apiAuth';
import { matchCurrentWholesalersToGoogleLeads } from '@/lib/wholesaleLeadService';

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const result = await matchCurrentWholesalersToGoogleLeads({
      limit: body.limit,
    }, actor);

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/match-current-accounts error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to match current wholesale accounts' }, { status: error.status || 500 });
  }
}
