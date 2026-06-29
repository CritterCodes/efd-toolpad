import { NextResponse } from 'next/server';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRole } from '@/lib/apiAuth';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';

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
    const { logID, creditedLaborHours, notes, allocations } = body;
    if (!logID) return NextResponse.json({ error: 'logID is required.' }, { status: 400 });

    const existing = await RepairLaborLogsModel.findByLogID(logID);
    if (!existing) return NextResponse.json({ error: 'Labor log not found.' }, { status: 404 });

    // SPLIT credit across multiple jewelers: the first allocation updates this log;
    // the rest become their own reviewed labor logs on the same work order/repair, so
    // each jeweler is paid for their share (e.g. Vernon sized it, you set the stone).
    if (Array.isArray(allocations) && allocations.length) {
      const allocs = allocations
        .map((a) => ({ userID: String(a.userID || '').trim(), name: a.name || '', hours: parseFloat(a.hours) || 0 }))
        .filter((a) => a.userID && a.hours > 0);
      if (!allocs.length) {
        return NextResponse.json({ error: 'Each split needs a jeweler and hours > 0.' }, { status: 400 });
      }
      const priced = [];
      for (const a of allocs) {
        const rate = Number(await getLaborRateSnapshotForUser({ userID: a.userID, session })) || 0;
        priced.push({ ...a, rate, value: a.hours * rate });
      }
      const [first, ...rest] = priced;
      const updated = await RepairLaborLogsModel.updateById(logID, {
        primaryJewelerUserID: first.userID,
        primaryJewelerName: first.name || existing.primaryJewelerName,
        creditedLaborHours: first.hours,
        laborRateSnapshot: first.rate,
        creditedValue: first.value,
        notes: notes || '',
        adminReviewedBy: session.user.userID,
        adminReviewedAt: new Date(),
        requiresAdminReview: false,
      });
      for (const r of rest) {
        const created = await RepairLaborLogsModel.create({
          workOrderID: existing.workOrderID,
          sourceType: existing.sourceType,
          sourceID: existing.sourceID,
          repairID: existing.repairID,
          primaryJewelerUserID: r.userID,
          primaryJewelerName: r.name,
          creditedLaborHours: r.hours,
          laborRateSnapshot: r.rate,
          creditedValue: r.value,
          sourceAction: existing.sourceAction,
          pendingQc: existing.pendingQc,
          requiresAdminReview: false,
          notes: notes || '',
        });
        await RepairLaborLogsModel.updateById(created.logID, {
          adminReviewedBy: session.user.userID,
          adminReviewedAt: new Date(),
        });
      }
      return NextResponse.json(updated, { status: 200 });
    }

    const hours = parseFloat(creditedLaborHours) || 0;
    const rate = Number(existing.laborRateSnapshot) || await getLaborRateSnapshotForUser({
      userID: existing.primaryJewelerUserID,
      session,
    });

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
