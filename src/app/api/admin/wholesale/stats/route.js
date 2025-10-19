// /api/admin/wholesale/stats/route.js
import { getWholesaleApplicationStats } from '../../../../../lib/wholesaleService.js';

export async function GET(request) {
  try {
    const stats = await getWholesaleApplicationStats();
    return Response.json(stats);
  } catch (error) {
    console.error('Error in GET /api/admin/wholesale/stats:', error);
    return Response.json({ error: 'Failed to fetch wholesale statistics' }, { status: 500 });
  }
}