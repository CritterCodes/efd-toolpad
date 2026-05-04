import { requireRole } from '@/lib/apiAuth';
import { getWholesaleLead, updateWholesaleLead } from '@/lib/wholesaleLeadService';

export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { leadId } = await params;
    const lead = await getWholesaleLead(leadId);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    return Response.json({ success: true, data: lead });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads/[leadId] error:', error);
    return Response.json({ success: false, error: 'Failed to fetch wholesale lead' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const { leadId } = await params;
    const lead = await updateWholesaleLead(leadId, body, actor);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    return Response.json({ success: true, data: lead });
  } catch (error) {
    console.error('PATCH /api/admin/wholesale-leads/[leadId] error:', error);
    const status = error.message?.includes('Invalid') ? 400 : 500;
    return Response.json({ success: false, error: error.message || 'Failed to update wholesale lead' }, { status });
  }
}
