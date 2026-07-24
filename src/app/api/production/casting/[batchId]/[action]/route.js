import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import {
  markCastingOrdered, markCastingReceived, markCastingPaid, markCastingDelivered,
  disputeCasting, acceptCasting, cancelCastingBatch, CastingError,
} from '@/services/production/castingBoard';

const HANDLERS = {
  order: markCastingOrdered,
  receive: markCastingReceived,
  pay: markCastingPaid,
  deliver: markCastingDelivered,
  dispute: disputeCasting,
  accept: acceptCasting,
  cancel: cancelCastingBatch,
};

// Paying (receive/pay) and staff-only transitions are gated tighter than owner-visible ones.
const STAFF_ONLY = new Set(['pay']);

/**
 * POST /api/production/casting/[batchId]/[action] — drive a casting batch:
 * order | receive | pay | deliver | dispute | accept | cancel. Staff, or the batch's owning
 * artisan (their own runs' castings). `pay` is staff-only (settlement is recorded by EFD/Stripe).
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
    return NextResponse.json({ error: 'Only staff can record casting payment.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    // Path param LAST so a body-supplied batchId can't override the ownership-checked id (IDOR).
    const result = await handler({ ...body, batchId });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof CastingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
};
