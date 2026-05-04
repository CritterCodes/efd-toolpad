import { requireRole } from '@/lib/apiAuth';
import {
  createWholesaleImportJob,
  getLatestWholesaleImportJob,
  runWholesaleImportJob,
} from '@/lib/wholesaleLeadService';

export async function GET() {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const job = await getLatestWholesaleImportJob();
    return Response.json({ success: true, data: job });
  } catch (error) {
    console.error('GET /api/admin/wholesale-leads/google-search error:', error);
    return Response.json({ success: false, error: 'Failed to fetch import job' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const actor = session.user.userID || session.user.email;
    const options = {
      queries: Array.isArray(body.queries) ? body.queries.filter(Boolean) : undefined,
      searchLocations: Array.isArray(body.searchLocations) ? body.searchLocations.filter(Boolean) : undefined,
      radiusMeters: body.radiusMeters ? Number(body.radiusMeters) : undefined,
      autoScore: body.autoScore !== false,
      minImportScore: body.minImportScore ? Number(body.minImportScore) : undefined,
      maxCandidates: body.maxCandidates ? Number(body.maxCandidates) : undefined,
      discoverEmails: body.discoverEmails !== false,
    };
    const job = await createWholesaleImportJob(options, actor);
    if (process.env.WHOLESALE_IMPORT_RUN_IN_API === 'true') {
      setTimeout(() => {
        runWholesaleImportJob(job.id, actor).catch((error) => {
          console.error('Wholesale import job failed:', error);
        });
      }, 0);
    }

    return Response.json({ success: true, data: job }, { status: 202 });
  } catch (error) {
    console.error('POST /api/admin/wholesale-leads/google-search error:', error);
    const status = error.message?.includes('configured') ? 500 : 502;
    return Response.json({ success: false, error: error.message || 'Failed to start Google Places import' }, { status });
  }
}
