import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { completePieceWorkOrder } from '@/services/bench/pieceWorkOrderActions';

/**
 * POST /api/bench/work-orders/[workOrderID]/complete
 * Logs labor for the piece work order (pays the artisan) and re-rolls the piece COGS.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID } = await params;
  try {
    const result = await completePieceWorkOrder({ session, workOrderID });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
