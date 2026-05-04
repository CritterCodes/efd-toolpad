import { requireRole } from '@/lib/apiAuth';
import { linkWholesaleLeadApplication } from '@/lib/wholesaleLeadService';

export async function POST(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const { leadId } = await params;
    const lead = await linkWholesaleLeadApplication(leadId, body, actor);
    if (!lead) {
      return Response.json({ success: false, error: 'Matching wholesale application not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: lead });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/[leadId]/link-application error:', error);
    const status = error.message?.includes('required') ? 400 : 500;
    return Response.json({ success: false, error: error.message || 'Failed to link wholesale application' }, { status });
  }
}
