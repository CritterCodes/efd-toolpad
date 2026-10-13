import { requireWholesaleAcquisition } from '@/lib/apiAuth';
import {
  createWholesaleRescoreJob,
  getLatestWholesaleRescoreJob,
  runWholesaleRescoreJob,
} from '@/lib/wholesaleLeadService';
import { TARGET_PROFILE_KEYS } from '@/lib/wholesaleLeads/targetProfile';

export async function GET() {
  try {
    const { errorResponse } = await requireWholesaleAcquisition();
    if (errorResponse) return errorResponse;

    const job = await getLatestWholesaleRescoreJob();
    return Response.json({ success: true, data: job });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads/bulk-rescore error:', error);
    return Response.json({ success: false, error: 'Failed to fetch rescore job' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireWholesaleAcquisition();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const job = await createWholesaleRescoreJob({
      leadIds: Array.isArray(body.leadIds) ? body.leadIds.filter(Boolean) : [],
      scope: body.scope === 'active' ? 'active' : 'selected',
      // Omitted = each lead keeps the rubric it was scored under. Naming one re-scores against it.
      profileName: TARGET_PROFILE_KEYS.includes(body.profileName) ? body.profileName : null,
    }, actor);

    setTimeout(() => {
      runWholesaleRescoreJob(job.id, actor).catch((error) => {
        console.error('Wholesale rescore job failed:', error);
      });
    }, 0);

    return Response.json({ success: true, data: job }, { status: 202 });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/bulk-rescore error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to start rescore job' }, { status: error.status || 500 });
  }
}
