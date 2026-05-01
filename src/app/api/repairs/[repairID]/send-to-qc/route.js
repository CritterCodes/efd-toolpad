import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRepairOps } from '@/lib/apiAuth';
import {
  calculateRepairChargeTotal,
  calculateRepairLaborHours,
  getLaborRateSnapshot,
} from '@/app/api/repairLaborLogs/utils';
import { buildMoveToQcUpdate } from '@/services/repairWorkflow';

export async function moveRepairToQc(session, repairID) {
  if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

  const repair = await RepairsModel.findById(repairID);

  const callerID = session.user.userID;
  const requiresSharedWorkReview = repair.requiresLaborReview === true;
  const creditedLaborHours = calculateRepairLaborHours(repair);
  const laborRateSnapshot = await getLaborRateSnapshot(session);
  const laborPaySnapshot = creditedLaborHours * laborRateSnapshot;
  const repairChargeTotal = calculateRepairChargeTotal(repair);
  const requiresCompReview = (
    (repairChargeTotal > 0 && creditedLaborHours <= 0)
    || 
    laborRateSnapshot <= 0
    || (repairChargeTotal > 0 && laborPaySnapshot > repairChargeTotal)
  );
  const requiresReview = requiresSharedWorkReview || requiresCompReview;

  const reviewNotes = [];
  if (requiresSharedWorkReview) {
    reviewNotes.push('Shared-work repair requires admin labor review.');
  }
  if (repairChargeTotal > 0 && creditedLaborHours <= 0) {
    reviewNotes.push('Chargeable repair has no labor hours snapshot. Confirm hours before payout.');
  }
  if (laborRateSnapshot <= 0) {
    reviewNotes.push('Missing hourly rate snapshot. Confirm pay rate before payout.');
  }
  if (repairChargeTotal > 0 && laborPaySnapshot > repairChargeTotal) {
    reviewNotes.push(`Labor pay snapshot ${laborPaySnapshot.toFixed(2)} exceeds current repair total ${repairChargeTotal.toFixed(2)}.`);
  }

  await RepairLaborLogsModel.create({
    repairID,
    primaryJewelerUserID: callerID,
    primaryJewelerName: session.user.name,
    creditedLaborHours,
    laborRateSnapshot,
    sourceAction: 'move_to_qc',
    requiresAdminReview: requiresReview,
    notes: reviewNotes.join(' '),
  });

  return await RepairsModel.updateById(repairID, buildMoveToQcUpdate({
    userName: session.user.name,
    now: new Date(),
  }));
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    const updated = await moveRepairToQc(session, repairID);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in send-to-qc route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
