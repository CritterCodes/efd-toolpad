import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { canManageDesign } from '@/lib/designPermissions';
import {
  claimDesignCad, submitDesignCadToQc, approveDesignCad, rejectDesignCad, DesignCadError,
} from '@/services/production/designCad';

const HANDLERS = {
  claim: claimDesignCad,
  'submit-qc': submitDesignCadToQc,
  approve: approveDesignCad,
  reject: rejectDesignCad,
};

/**
 * POST /api/production/designs/[designID]/cad-request/[action] — drive the design CAD lifecycle:
 * claim | submit-qc | approve | reject. Staff or the owning artisan. `approve` self-certifies when
 * the approver is the author (solo); EFD-paid work should be peer-approved by a different reviewer.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { designID, action } = await params;
  const handler = HANDLERS[action];
  if (!handler) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const workOrderID = body.workOrderID;
  if (!workOrderID) return NextResponse.json({ error: 'workOrderID is required.' }, { status: 400 });
  // Scope the WO to THIS design — a manager of design X must not act on design Y's CAD WO (IDOR).
  const wo = await WorkOrdersModel.findByID(workOrderID);
  if (!wo || wo.sourceID !== designID || wo.sourceType !== WORK_ORDER_SOURCE.CAD_REQUEST) {
    return NextResponse.json({ error: 'CAD work order not found for this design.' }, { status: 404 });
  }

  try {
    // Trusted values (session + path-scoped WO) LAST so NOTHING in the body can override the
    // authenticated session or the authorized workOrderID (IDOR / privilege escalation).
    const result = await handler({ ...body, session, workOrderID });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof DesignCadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
};
