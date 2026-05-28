import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import SalesInvoicesModel from '@/app/api/sales-invoices/model';

/**
 * GET /api/artisan/my-work
 * Returns the authenticated artisan's weekly labor summary and their sales invoices.
 * Add ?detail=true&weekStart=ISO to get a repair-level labor breakdown for a specific week.
 */
export const GET = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['artisan']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const detail = searchParams.get('detail') === 'true';
    const weekStart = searchParams.get('weekStart');
    const userID = session.user.userID;

    if (detail) {
      const breakdown = await RepairLaborLogsModel.weeklyBreakdown({ weekStart, userID });
      return NextResponse.json(breakdown, { status: 200 });
    }

    const [laborWeeks, salesInvoices] = await Promise.all([
      RepairLaborLogsModel.weeklyReport({ userID }),
      SalesInvoicesModel.findAll({ createdBy: userID }),
    ]);

    return NextResponse.json({ laborWeeks, salesInvoices }, { status: 200 });
  } catch (error) {
    console.error('GET /api/artisan/my-work error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
