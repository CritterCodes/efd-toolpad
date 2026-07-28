import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import {
  markCastingOrdered, markCastingReceived, markCastingPaid, markCastingDelivered,
  disputeCasting, acceptCasting, cancelCastingBatch, CastingError,
} from '@/services/production/castingBoard';
import { placeVendorCastingOrder, CastingOrderError } from '@/services/production/castingVendorOrder';

const HANDLERS = {
  order: markCastingOrdered,           // record an order placed out-of-band (manual)
  'place-order': placeVendorCastingOrder, // EMAIL the vendor (Carrera) + drop-ship snapshot, then order
  receive: markCastingReceived,
  pay: markCastingPaid,
  deliver: markCastingDelivered,
  dispute: disputeCasting,
  accept: acceptCasting,
  cancel: cancelCastingBatch,
};

// Paying (receive/pay) and staff-only transitions are gated tighter than owner-visible ones.
// `pay` = settlement is EFD/Stripe's to record. `place-order` = it sends an order on EFD's vendor
// account (and EFD floats the cost), so only staff may fire it — artisans open the batch, EFD places it.
const STAFF_ONLY = new Set(['pay', 'place-order']);

/**
 * POST /api/production/casting/[batchId]/[action] — drive a casting batch:
 * place-order | order | receive | pay | deliver | dispute | accept | cancel. Staff, or the batch's
 * owning artisan (their own runs' castings). STAFF-ONLY: `pay` (settlement is recorded by
 * EFD/Stripe) and `place-order` (it emails EFD's vendor account manager and EFD floats the cost).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { batchId, action } = await params;
  const handler = HANDLERS[action];
  if (!handler) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) return NextResponse.json({ error: 'Casting batch not found.' }, { status: 404 });
  const staff = isStaff(session);
  if (!staff && batch.ownerId !== session.user.userID) {
    return NextResponse.json({ error: 'Access denied — not your casting batch.' }, { status: 403 });
  }
  if (STAFF_ONLY.has(action) && !staff) {
    return NextResponse.json({ error: `Only staff can ${action === 'pay' ? 'record casting payment' : 'place a vendor casting order'}.` }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    // Path param + session-derived identity LAST so nothing in the body can override the
    // ownership-checked batchId or spoof who placed the order (IDOR / attribution).
    const result = await handler({ ...body, batchId, sentBy: session.user.userID });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof CastingError || e instanceof CastingOrderError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
};
