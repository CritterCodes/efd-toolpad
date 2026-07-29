// /api/admin/artisans/route.js
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { getAllArtisanApplications, getArtisanApplicationStats } from '../../../../lib/artisanService.js';

/**
 * Artisan APPLICATION REVIEW — staff only.
 *
 * `middleware.js` deliberately skips `/api/*` ("API routes handle their own auth"), so this route must
 * check the session itself. Until it did, GET returned every applicant's email, phone, business
 * address and portfolio links to ANYONE unauthenticated — an application record is PII and the
 * applicant pool is not public. `?action=stats` is gated too: aggregate counts of who applied are
 * still business data.
 */

export async function GET(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getArtisanApplicationStats();
      return Response.json(stats);
    }

    // Default: get all applications
    const filters = {};
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('artisanType')) filters.artisanType = searchParams.get('artisanType');
    if (searchParams.get('dateFrom')) filters.dateFrom = searchParams.get('dateFrom');
    if (searchParams.get('dateTo')) filters.dateTo = searchParams.get('dateTo');

    const applications = await getAllArtisanApplications(filters);
    return Response.json(applications);
  } catch (error) {
    console.error('Error in GET /api/admin/artisans:', error);
    return Response.json({ error: 'Failed to fetch artisan data' }, { status: 500 });
  }
}