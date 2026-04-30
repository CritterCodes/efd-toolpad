import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const updated = await RepairsModel.updateById(repairID, {
      status: 'PARTS ORDERED',
      benchStatus: 'WAITING_PARTS',
      partsOrderedBy: session.user.name,
      partsOrderedDate: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in mark-parts-ordered route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
