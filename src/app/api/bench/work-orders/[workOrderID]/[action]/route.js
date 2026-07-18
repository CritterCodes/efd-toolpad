import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { runBenchAction } from '@/services/bench/benchActions';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { moveCastingWOToQc, completeCastingWOFromQc } from '@/services/casting/castingService';

const CODE_STATUS = {
  FORBIDDEN: 403,
  LANE_FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

const PIECE_SOURCES = [WORK_ORDER_SOURCE.PRODUCTION_PIECE, WORK_ORDER_SOURCE.CUSTOM_PIECE];

/**
 * POST /api/bench/work-orders/[workOrderID]/[action]
 * The single unified bench action surface. Authorization + source branching
 * live in runBenchAction; this route just authenticates, parses, and maps
 * error codes to HTTP statuses.
 *
 * Casting-discipline WOs intercept move-to-qc and complete-from-qc to use the
 * flat castingLaborFee payout model instead of the generic hours×rate path.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID, action } = await params;
  try {
    const body = await req.json().catch(() => ({}));

    // Casting-specific payout model: intercept move-to-qc and complete-from-qc
    // for casting-discipline piece work orders so the flat castingLaborFee is
    // used instead of hours×rate.
    if (action === 'move-to-qc' || action === 'complete-from-qc') {
      const wo = await WorkOrdersModel.findByID(workOrderID);
      if (wo && PIECE_SOURCES.includes(wo.sourceType) && wo.discipline === DISCIPLINE.CASTING) {
        const result = action === 'move-to-qc'
          ? await moveCastingWOToQc({ session, workOrderID, wo })
          : await completeCastingWOFromQc({ session, workOrderID, wo });
        return NextResponse.json(result, { status: 200 });
      }
    }

    const result = await runBenchAction({ session, workOrderID, action, body });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error(`Error in bench action "${action}":`, error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
