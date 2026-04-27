import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('qualityControl');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const nextStatus = body.deliveryBatched ? 'DELIVERY BATCHED' : (body.readyForPickup ? 'READY FOR PICKUP' : 'COMPLETED');

    const updated = await RepairsModel.updateById(repairID, {
      status: nextStatus,
      benchStatus: 'UNCLAIMED',
      qcBy: session.user.name,
      qcDate: new Date(),
      completedBy: session.user.name,
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in complete-from-qc route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
