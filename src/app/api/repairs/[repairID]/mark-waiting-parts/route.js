import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('parts');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const updated = await RepairsModel.updateById(repairID, {
      status: 'NEEDS PARTS',
      benchStatus: 'WAITING_PARTS',
      partsOrderedBy: session.user.name,
      partsOrderedDate: body.partsOrderedDate ? new Date(body.partsOrderedDate) : new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in mark-waiting-parts route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
