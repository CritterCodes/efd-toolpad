import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import ShipmentsModel from '@/app/api/shipments/model';
import { markShipped, markDelivered, cancelShipment, ShippingError } from '@/services/production/shipping';

const HANDLERS = { ship: markShipped, deliver: markDelivered, cancel: cancelShipment };

/** POST /api/production/shipments/[shipmentId]/[action] — ship | deliver | cancel. Owner or staff. */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { shipmentId, action } = await params;
  const handler = HANDLERS[action];
  if (!handler) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  const shipment = await ShipmentsModel.findById(shipmentId);
  if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  if (!isStaff(session) && shipment.ownerId !== session.user.userID) {
    return NextResponse.json({ error: 'Access denied — not your shipment.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    // Path param LAST so a body-supplied shipmentId can't override the ownership-checked id (IDOR).
    const result = await handler({ ...body, shipmentId });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof ShippingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
};
