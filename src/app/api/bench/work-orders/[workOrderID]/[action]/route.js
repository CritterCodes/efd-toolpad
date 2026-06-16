import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { runBenchAction } from '@/services/bench/benchActions';

const CODE_STATUS = {
  FORBIDDEN: 403,
  LANE_FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

/**
 * POST /api/bench/work-orders/[workOrderID]/[action]
 * The single unified bench action surface. Authorization + source branching
 * live in runBenchAction; this route just authenticates, parses, and maps
 * error codes to HTTP statuses.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID, action } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runBenchAction({ session, workOrderID, action, body });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error(`Error in bench action "${action}":`, error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
