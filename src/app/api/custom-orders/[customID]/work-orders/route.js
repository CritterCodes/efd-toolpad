import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getCustomWorkOrders, spawnCustomWorkOrder } from '@/services/customs/customProduction';

/** GET /api/custom-orders/[customID]/work-orders — the custom's child work orders + labor. */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  const workOrders = await getCustomWorkOrders(customID);
  return NextResponse.json(workOrders, { status: 200 });
};

/** POST /api/custom-orders/[customID]/work-orders — spawn one work order in a discipline. */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.discipline) return NextResponse.json({ error: 'discipline is required.' }, { status: 400 });
  try {
    const wo = await spawnCustomWorkOrder({
      customID,
      discipline: body.discipline,
      title: body.title || null,
      assignedToUserID: body.assignedToUserID || null,
      assignedJeweler: body.assignedJeweler || null,
      estLaborHours: body.estLaborHours || 0,
      process: body.process || null,
      createdBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Custom order not found.' ? 404 : 500 });
  }
};
