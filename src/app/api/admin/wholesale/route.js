// /api/admin/wholesale/route.js
import { getAllWholesaleApplications, getWholesaleApplicationStats } from '../../../../lib/wholesaleService.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getWholesaleApplicationStats();
      return Response.json(stats);
    }

    // Default: get all applications
    const filters = {};
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('dateFrom')) filters.dateFrom = searchParams.get('dateFrom');
    if (searchParams.get('dateTo')) filters.dateTo = searchParams.get('dateTo');

    const applications = await getAllWholesaleApplications(filters);
    return Response.json(applications);
  } catch (error) {
    console.error('Error in GET /api/admin/wholesale:', error);
    return Response.json({ error: 'Failed to fetch wholesale data' }, { status: 500 });
  }
}
