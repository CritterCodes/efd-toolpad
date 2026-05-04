import { requireRole } from '@/lib/apiAuth';
import { createWholesaleLead, listWholesaleLeads } from '@/lib/wholesaleLeadService';

export async function GET(request) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const leads = await listWholesaleLeads({
      status: searchParams.get('status'),
      source: searchParams.get('source'),
      city: searchParams.get('city'),
      state: searchParams.get('state'),
      minScore: searchParams.get('minScore'),
      search: searchParams.get('search'),
    });

    return Response.json({ success: true, data: leads });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads error:', error);
    return Response.json({ success: false, error: 'Failed to fetch wholesale leads' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const result = await createWholesaleLead(body, actor);

    return Response.json({ success: true, ...result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads error:', error);
    const status = error.message?.includes('required') || error.message?.includes('Invalid') ? 400 : 500;
    return Response.json({ success: false, error: error.message || 'Failed to create wholesale lead' }, { status });
  }
}
