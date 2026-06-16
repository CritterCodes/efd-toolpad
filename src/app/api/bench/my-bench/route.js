import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { getBenchWorkOrders } from '@/services/bench/benchQuery';

/**
 * GET /api/bench/my-bench
 * Work-order-driven, discipline-gated bench across all sources (repairs, pieces,
 * sale-service, cad). Replaces /api/repairs/my-bench in the UI phase.
 */
export const GET = async () => {
  try {
    const { session, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const items = await getBenchWorkOrders({ session });
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error in unified my-bench route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
