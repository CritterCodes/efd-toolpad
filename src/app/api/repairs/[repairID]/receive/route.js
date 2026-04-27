import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('receiving');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const updated = await RepairsModel.updateById(repairID, {
      receivedBy: session.user.userID,
      receivedAt: new Date(),
      status: 'READY FOR WORK',
      benchStatus: 'UNCLAIMED',
      internalNotes: body.internalNotes !== undefined ? body.internalNotes : undefined,
      updatedAt: new Date(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in receive route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
