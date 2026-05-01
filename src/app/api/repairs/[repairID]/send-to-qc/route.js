import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { requireRepairOps } from '@/lib/apiAuth';
import { calculateRepairLaborHours, getLaborRateSnapshot } from '@/app/api/repairLaborLogs/utils';
import { buildMoveToQcUpdate } from '@/services/repairWorkflow';

export async function moveRepairToQc(session, repairID) {
  if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

  const repair = await RepairsModel.findById(repairID);

  const callerID = session.user.userID;
  const requiresReview = repair.requiresLaborReview === true;
  const creditedLaborHours = calculateRepairLaborHours(repair);
  const laborRateSnapshot = getLaborRateSnapshot(session);

  await RepairLaborLogsModel.create({
    repairID,
    primaryJewelerUserID: callerID,
    primaryJewelerName: session.user.name,
    creditedLaborHours: requiresReview ? 0 : creditedLaborHours,
    laborRateSnapshot,
    sourceAction: 'move_to_qc',
    requiresAdminReview: requiresReview,
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
