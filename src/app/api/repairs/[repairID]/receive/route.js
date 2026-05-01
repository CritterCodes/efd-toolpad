import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildReceiveRepairUpdate } from '@/services/repairWorkflow';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('receiving');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const updated = await RepairsModel.updateById(repairID, buildReceiveRepairUpdate({
      userID: session.user.userID,
      internalNotes: body.internalNotes !== undefined ? body.internalNotes : undefined,
      now: new Date(),
    }));

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in receive route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
