import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { getUncreditedTaskIndexes, getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { buildMoveToQcUpdate } from '@/services/repairWorkflow';

/**
 * Move a repair to QC. Labor is NOT credited here — it's credited when the repair PASSES QC
 * (creditRepairLaborAtQc). This step just STAMPS any not-yet-signed-off tasks as done by the
 * repair's assigned jeweler — so the final segment of a handoff chain (or a solo repair) is
 * attributed correctly — then transitions to QC. Attribution uses the assignee, not the
 * clicker, so an admin moving a job to QC on a jeweler's behalf still credits the jeweler.
 */
export async function moveRepairToQc(session, repairID) {
  if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

  const repair = await RepairsModel.findById(repairID);
  const now = new Date();

  const assigneeID = repair.assignedTo || session.user.userID;
  const assigneeName = repair.assignedJeweler || session.user.name;
  const uncredited = getUncreditedTaskIndexes(repair);

  let tasks = repair.tasks || [];
  if (uncredited.length) {
    const rate = Number(await getLaborRateSnapshotForUser({ userID: assigneeID, session })) || 0;
    const stamp = new Set(uncredited);
    tasks = tasks.map((task, i) => (
      stamp.has(i)
        ? { ...task, completedByUserID: assigneeID, completedByName: assigneeName, completedAt: now, laborRateSnapshot: rate }
        : task
    ));
  }

  return RepairsModel.updateById(repairID, {
    tasks,
    ...buildMoveToQcUpdate({ userName: session.user.name, now }),
  });
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
