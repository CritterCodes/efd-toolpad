import { NextResponse } from 'next/server';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRole } from '@/lib/apiAuth';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { assertCanHoldWork, apprenticeErrorStatus } from '@/services/pay/apprentice';
import { isLaborLogLocked } from '@/services/payrollUtils';

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
    // A credit in a payroll batch (or paid) can't be re-reviewed or split: a split mints new, unbatched
    // credits that get paid again (EFD-DEFECTS P1). Correct a paid credit in payroll.
    if (isLaborLogLocked(existing)) {
      return NextResponse.json({
        error: `This credit is already in payroll batch ${existing.payrollBatchID || '(unknown)'} — it can't be reviewed again. Adjust it in payroll.`,
        code: 'LABOR_LOG_LOCKED',
      }, { status: 409 });
    }

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
      // Bench credit never goes to an apprentice — they are paid on the clock, so a split to one pays
      // the same hours twice (services/pay/apprentice.js).
      for (const a of allocs) await assertCanHoldWork(a.userID, { who: 'other' });
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

    // Approving a log as-is keeps it on whoever it's credited to. A log held because it landed on an
    // apprentice has to be SPLIT to the jeweler who held the job, not approved where it sits.
    await assertCanHoldWork(existing.primaryJewelerUserID, { who: 'other' });

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
    return NextResponse.json({ error: error.message }, { status: apprenticeErrorStatus(error) || 500 });
  }
};
