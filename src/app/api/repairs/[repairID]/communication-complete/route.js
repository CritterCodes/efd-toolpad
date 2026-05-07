import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildCommunicationCompleteUpdate } from '@/services/repairWorkflow';

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const repair = await RepairsModel.findById(repairID);
    const updated = await RepairsModel.updateById(
      repairID,
      buildCommunicationCompleteUpdate({ repair, now: new Date() })
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in communication-complete route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
