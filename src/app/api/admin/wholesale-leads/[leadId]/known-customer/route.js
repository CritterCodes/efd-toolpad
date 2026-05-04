import { requireRole } from '@/lib/apiAuth';
import { markWholesaleLeadAsKnownCustomer } from '@/lib/wholesaleLeadService';

export async function POST(_request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { leadId } = await params;
    const actor = session.user.userID || session.user.email;
    const lead = await markWholesaleLeadAsKnownCustomer(leadId, actor);
    if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

    return Response.json({ success: true, data: lead });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/[leadId]/known-customer error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to mark known customer' }, { status: 500 });
  }
}
