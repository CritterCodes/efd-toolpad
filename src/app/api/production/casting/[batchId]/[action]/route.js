import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import {
  markCastingOrdered, markCastingReceived, markCastingPaid, markCastingDelivered,
  disputeCasting, acceptCasting, cancelCastingBatch, CastingError,
} from '@/services/production/castingBoard';
import { placeVendorCastingOrder, CastingOrderError } from '@/services/production/castingVendorOrder';
import { billReceivedCasting, settleCastingInvoice, voidCastingInvoice } from '@/services/production/castingSettlement';

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
// `receive` = it records the ACTUAL vendor cost, which sets the artisan's charge (cost × markup) AND
// their pieces' COGS. EFD placed the order and holds the vendor invoice, so EFD reports the number —
// the debtor must never set their own debt (receiving at $0.01 would ship the casting for free).
const STAFF_ONLY = new Set(['pay', 'place-order', 'receive']);

/**
 * Actions a non-staff owner may NOT take on THIS batch, decided from the batch's own state.
 * Returns a reason string to refuse with, or null to allow. These mirror rules the UI also enforces —
 * the UI is convenience; THIS is the gate.
 */
function ownerRefusalReason(action, batch) {
  // `receive` sets the actual vendor cost → the artisan's charge + their pieces' COGS, so the debtor
  // must not report it. Unconditional: Carrera (vendor) is the ONLY casting path — artisan/in-house
  // casting was scrapped (PRODUCTION_RUNS.md §4.1), so every batch is a vendor batch EFD receives.
  if (action === 'receive') {
    return 'record a casting as received (it sets the actual vendor cost you’ll be billed for)';
  }
  // Cancelling leaves the charge unpaid but drops the batch off the board, so once a charge exists
  // only staff may cancel. (Pre-charge — needs_ordering/ordered — the owner may cancel freely.)
  if (action === 'cancel' && batch.charge?.amount != null && !batch.charge.paid) {
    return 'cancel a casting that still has an unpaid charge';
  }
  return null;
}

/**
 * POST /api/production/casting/[batchId]/[action] — drive a casting batch:
 * place-order | order | receive | pay | deliver | dispute | accept | cancel. Staff, or the batch's
 * owning artisan (their own runs' castings). Always staff-only: `pay` (settlement is EFD/Stripe's to
 * record) and `place-order` (it orders on EFD's vendor account, which EFD floats). Conditionally
 * staff-only: `receive` (always — it sets the debt) and `cancel` (once a charge is
 * outstanding) — see `ownerRefusalReason`.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { batchId, action } = await params;
  // Object.hasOwn, not a truthiness test: `HANDLERS['constructor']` etc. are inherited and truthy,
  // which would clear an `if (!handler)` check and dispatch a non-handler.
  if (!Object.hasOwn(HANDLERS, action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
  const handler = HANDLERS[action];

  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) return NextResponse.json({ error: 'Casting batch not found.' }, { status: 404 });
  const staff = isStaff(session);
  if (!staff && batch.ownerId !== session.user.userID) {
    return NextResponse.json({ error: 'Access denied — not your casting batch.' }, { status: 403 });
  }
  if (!staff) {
    const always = { pay: 'record casting payment', 'place-order': 'place a vendor casting order' }[action];
    const conditional = ownerRefusalReason(action, batch);
    const what = always || conditional;
    if (what) return NextResponse.json({ error: `Only staff can ${what}.` }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    // Path param + session-derived identity LAST so nothing in the body can override the
    // ownership-checked batchId or spoof who placed the order (IDOR / attribution).
    const result = await handler({ ...body, batchId, sentBy: session.user.userID });

    // RECEIPT BILLS THE ARTISAN. Until this call existed, casting debt never reached
    // `artisanInvoices`, so `isArtisanFrozen` (which reads that collection) could never fire for a
    // casting — the ship gate was a staff click and nothing else. Invoiced at the MARKED-UP charge.
    //
    // Deliberately NOT rolled back on failure: markCastingReceived has already split COGS onto the
    // pieces and set charge + shippingGated, so the nothing-ships-unpaid guarantee holds either way.
    // A billing failure is reported on the response instead of 500-ing or silently vanishing.
    if (action === 'receive') {
      const billing = await billReceivedCasting({ batchId, ownerId: batch.ownerId, createdBy: session.user.userID });
      return NextResponse.json({ ...result, billing }, { status: 200 });
    }
    // Recording payment must settle BOTH sides: markCastingPaid clears the ship gate, this clears the
    // debt. Without it the invoice goes overdue and freezes an artisan who already paid.
    if (action === 'pay') {
      const settlement = await settleCastingInvoice({ batchId });
      return NextResponse.json({ ...result, settlement }, { status: 200 });
    }
    // Cancelling an INVOICED batch must void the debt — same invariant as `pay`, other direction.
    // EFD is writing the casting off; leaving the invoice `pending_payment` would freeze the artisan
    // ~2 weeks later for a casting they never received, with nothing on the board left to click.
    if (action === 'cancel') {
      const settlement = await voidCastingInvoice({ batchId, reason: `casting batch ${batchId} cancelled` });
      return NextResponse.json({ ...result, settlement }, { status: 200 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof CastingError || e instanceof CastingOrderError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
};
