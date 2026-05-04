import { requireRole } from '@/lib/apiAuth';
import { bulkWholesaleLeadOutreach } from '@/lib/wholesaleLeadService';

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const data = await bulkWholesaleLeadOutreach(body, actor);

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/bulk-outreach error:', error);
    const status = error.status || (error.message?.includes('SMTP') ? 500 : 400);
    return Response.json({ success: false, error: error.message || 'Failed to run bulk outreach' }, { status });
  }
}
