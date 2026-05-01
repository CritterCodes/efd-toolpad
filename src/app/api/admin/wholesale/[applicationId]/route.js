import { requireRole } from '@/lib/apiAuth';
import { getWholesaleApplicationById } from '@/lib/wholesaleService.js';

export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { applicationId } = params;
    const application = await getWholesaleApplicationById(applicationId);

    if (!application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    return Response.json(application);
  } catch (error) {
    console.error('Error in GET /api/admin/wholesale/[applicationId]:', error);
    return Response.json({ error: 'Failed to fetch wholesale application' }, { status: 500 });
  }
}
