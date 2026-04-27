import { NextResponse } from 'next/server';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRole } from '@/lib/apiAuth';

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const pending = await RepairLaborLogsModel.findPendingReview();
    return NextResponse.json(pending, { status: 200 });
  } catch (error) {
    console.error('Error in labor-review GET route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { logID, creditedLaborHours, notes } = body;
    if (!logID) return NextResponse.json({ error: 'logID is required.' }, { status: 400 });

    const existing = await RepairLaborLogsModel.findByLogID(logID);
    if (!existing) return NextResponse.json({ error: 'Labor log not found.' }, { status: 404 });

    const hours = parseFloat(creditedLaborHours) || 0;
    const rate = Number(existing.laborRateSnapshot) || 0;

    const updated = await RepairLaborLogsModel.updateById(logID, {
      creditedLaborHours: hours,
      creditedValue: hours * rate,
      notes: notes || '',
      adminReviewedBy: session.user.userID,
      adminReviewedAt: new Date(),
      requiresAdminReview: false,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in labor-review POST route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
