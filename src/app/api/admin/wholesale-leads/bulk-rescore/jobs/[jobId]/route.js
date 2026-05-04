import { requireRole } from '@/lib/apiAuth';
import { getWholesaleRescoreJob } from '@/lib/wholesaleLeadService';

export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { jobId } = await params;
    const job = await getWholesaleRescoreJob(jobId);
    if (!job) return Response.json({ success: false, error: 'Rescore job not found' }, { status: 404 });

    return Response.json({ success: true, data: job });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads/bulk-rescore/jobs/[jobId] error:', error);
    return Response.json({ success: false, error: 'Failed to fetch rescore job' }, { status: 500 });
  }
}
