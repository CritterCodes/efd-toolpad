import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps, isAdmin } from '@/lib/apiAuth';
import { buildUnclaimRepairUpdate } from '@/services/repairWorkflow';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);

    if (!isAdmin(session) && repair.assignedTo !== session.user.userID) {
      return NextResponse.json({ error: 'You can only unclaim repairs assigned to you.' }, { status: 403 });
    }

    const updated = await RepairsModel.updateById(repairID, buildUnclaimRepairUpdate({ now: new Date() }));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in unclaim route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
