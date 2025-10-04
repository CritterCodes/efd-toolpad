// /api/admin/artisans/route.js
import { getAllArtisanApplications, getArtisanApplicationStats } from '../../../../lib/artisanService.js';

export async function GET(request) {
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