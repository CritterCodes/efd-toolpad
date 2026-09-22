import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';
import { buildCompleteFromQcUpdate } from '@/services/repairWorkflow';
import { creditRepairLaborAtQc } from '@/services/repairs/benchHandoff';
import { autoInvoiceAtQcPass } from '@/services/repairs/autoInvoice';
import { notifyReadyForPickup } from '@/services/repairs/readyForPickup';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps('qualityControl');
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    // Credit labor on QC pass (one log per jeweler from the sign-off stamps) — same as the
    // unified bench path. Idempotent, so it's safe regardless of which surface completes QC.
    const repair = await RepairsModel.findById(repairID);
    await creditRepairLaborAtQc({ repair, session });

    // QC pass always lands on COMPLETED first; auto-invoicing below advances the repair to
    // READY FOR PICKUP / DELIVERY BATCHED itself (createRepairInvoice's own status writes).
    // The old readyForPickup/deliveryBatched flags survive as the invoice's deliveryMethod.
    // If invoicing fails the repair STAYS COMPLETED — visible on the closeout tab, the old
    // manual flow, instead of silently skipping the bill.
    let updated = await RepairsModel.updateById(repairID, buildCompleteFromQcUpdate({
      nextStatus: 'COMPLETED',
      userName: session.user.name,
      now: new Date(),
    }));

    // Repairs land on an invoice AT QC PASS (owner, 2026-09-04) — the manual "move items to
    // the invoice" step on Payment & Pickup is now only the fallback.
    const autoInvoice = await autoInvoiceAtQcPass({
      repairID,
      deliveryMethod: body.deliveryBatched ? 'delivery' : 'pickup',
      createdBy: session.user.name || session.user.email || '',
    });
    if (autoInvoice.invoiced) {
      updated = await RepairsModel.findById(repairID);
    }

    // Retail customer: "ready for pickup" with the pay-ahead link (services/repairs/readyForPickup.js).
    // Best-effort, idempotent per repair; the old inline notice pointed the customer at the ADMIN app.
    const pickupNotice = await notifyReadyForPickup({
      repairID,
      invoiceID: autoInvoice.invoiced ? autoInvoice.invoiceID : null,
      actor: session.user.name || session.user.email || '',
    });
    if (pickupNotice.sent) updated = await RepairsModel.findById(repairID);

    return NextResponse.json({ ...updated, autoInvoice, pickupNotice }, { status: 200 });
  } catch (error) {
    console.error('Error in complete-from-qc route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
