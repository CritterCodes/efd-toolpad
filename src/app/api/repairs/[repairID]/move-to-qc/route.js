import { NextResponse } from 'next/server';
import { requireRepairOps } from '@/lib/apiAuth';
import { moveRepairToQc } from '../send-to-qc/route';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('benchWork');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    const updated = await moveRepairToQc(session, repairID);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in move-to-qc route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
