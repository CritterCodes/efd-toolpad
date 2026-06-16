import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { claimPieceWorkOrder } from '@/services/bench/pieceWorkOrderActions';

/** POST /api/bench/work-orders/[workOrderID]/claim — claim a piece work order (lane-enforced). */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID } = await params;
  try {
    const workOrder = await claimPieceWorkOrder({ session, workOrderID });
    return NextResponse.json(workOrder, { status: 200 });
  } catch (error) {
    const status = error.code === 'LANE_FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
};
