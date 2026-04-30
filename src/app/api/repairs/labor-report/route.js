import { NextResponse } from 'next/server';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRole } from '@/lib/apiAuth';

/**
 * GET /api/repairs/labor-report?weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD&userID=...
 * Admin-only. Returns weekly payroll aggregation from repairLaborLogs.
 * Add detail=true with weekStart and userID to return the repair-level breakdown.
 */
export const GET = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const userID = searchParams.get('userID');
    const detail = searchParams.get('detail') === 'true';

    if (detail) {
      const report = await RepairLaborLogsModel.weeklyBreakdown({ weekStart, userID });
      return NextResponse.json(report, { status: 200 });
    }

    const report = await RepairLaborLogsModel.weeklyReport({ weekStart, weekEnd, userID });
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('❌ Error in labor-report route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
