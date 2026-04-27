import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);

    const previousJeweler = repair.assignedTo;
    const callerID = session.user.userID;
    const isSharedWork = previousJeweler && previousJeweler !== callerID;

    const updateData = {
      assignedTo: callerID,
      assignedJeweler: session.user.name,
      claimedAt: new Date(),
      status: 'IN PROGRESS',
      benchStatus: 'IN_PROGRESS',
      updatedAt: new Date(),
    };

    if (isSharedWork) updateData.requiresLaborReview = true;

    const updated = await RepairsModel.updateById(repairID, updateData);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in claim route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
