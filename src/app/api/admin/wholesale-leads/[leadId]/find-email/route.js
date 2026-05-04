import { requireRole } from '@/lib/apiAuth';
import { findWholesaleLeadEmail } from '@/lib/wholesaleLeadService';

export async function POST(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const actor = session.user.userID || session.user.email;
    const { leadId } = await params;
    const lead = await findWholesaleLeadEmail(leadId, actor);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    return Response.json({ success: true, data: lead });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/[leadId]/find-email error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to find email' }, { status: error.status || 500 });
  }
}
