import { requireRole } from '@/lib/apiAuth';
import { cancelWholesaleImportJob, getWholesaleImportJob } from '@/lib/wholesaleLeadService';

export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { jobId } = await params;
    const job = await getWholesaleImportJob(jobId);
    if (!job) return Response.json({ success: false, error: 'Import job not found' }, { status: 404 });

    return Response.json({ success: true, data: job });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads/google-search/jobs/[jobId] error:', error);
    return Response.json({ success: false, error: 'Failed to fetch import job' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { jobId } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'cancel') {
      return Response.json({ success: false, error: 'Unsupported job action' }, { status: 400 });
    }

    const actor = session.user.userID || session.user.email;
    const job = await cancelWholesaleImportJob(jobId, actor);
    if (!job) return Response.json({ success: false, error: 'Import job is not running' }, { status: 409 });

    return Response.json({ success: true, data: job });
  } catch (error) {
    console.error('PATCH /api/admin/wholesale-leads/google-search/jobs/[jobId] error:', error);
    return Response.json({ success: false, error: 'Failed to cancel import job' }, { status: 500 });
  }
}
