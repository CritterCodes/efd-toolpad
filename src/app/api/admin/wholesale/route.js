// /api/admin/wholesale/route.js
import { requireRole } from '@/lib/apiAuth';
import {
  getActiveWholesalers,
  getAllWholesaleApplications,
  getWholesaleApplicationStats,
  getWholesaleReconciliationReport,
} from '../../../../lib/wholesaleService.js';

export async function GET(request) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getWholesaleApplicationStats();
      return Response.json(stats);
    }

    if (action === 'wholesalers') {
      const wholesalers = await getActiveWholesalers();
      return Response.json({
        success: true,
        data: wholesalers,
      });
    }

    if (action === 'reconciliation') {
      const report = await getWholesaleReconciliationReport();
      return Response.json(report);
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
