import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import ShipmentsModel from '@/app/api/shipments/model';
import { createShipment, ShippingError } from '@/services/production/shipping';
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import { shipmentRefusal } from '@/services/production/productionAccess';

/** GET /api/production/shipments — scoped: staff see all, an artisan sees their own. ?runId/?status. */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { searchParams } = new URL(req.url);
  const filter = {};
  if (!isStaff(session)) filter.ownerId = session.user.userID;
  if (searchParams.get('runId')) filter.runId = searchParams.get('runId');
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  const shipments = await ShipmentsModel.list(filter);
  return NextResponse.json({ shipments }, { status: 200 });
};

/** POST /api/production/shipments — open a shipping leg. Body: from/to/pieceIDs/castingBatchId/carrier/tracking/declaredValue. */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const ownerId = isStaff(session) && body.ownerId ? body.ownerId : session.user.userID;
  // Signed in isn't enough: an artisan ships only their own pieces and casting batches (productionAccess).
  const refusal = await shipmentRefusal(session, body, {
    loadDesign: (id) => DesignsModel.findById(id).catch(() => null),
    loadPiece: (id) => PiecesModel.findById(id).catch(() => null),
    loadBatch: (id) => CastingBatchesModel.findById(id).catch(() => null),
  });
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status });
  try {
    const shipment = await createShipment({ ...body, ownerId, createdBy: session.user.userID });
    return NextResponse.json(shipment, { status: 201 });
  } catch (e) {
    if (e instanceof ShippingError || e instanceof TypeError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
};
