import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import PiecesModel from '@/app/api/pieces/model';
import { NotificationService } from '@/lib/notificationService';
import { maybeCompleteCustomOrder } from '@/services/customs/customStatus';
import { BENCH_ACTION_URL, loadPieceWorkOrder, woLabel } from './shared';
/** Approve a piece work order out of QC — release held labor, finalize, re-roll COGS. */
export async function completePieceWorkOrderFromQc({ workOrderID, completedBy = null }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  await RepairLaborLogsModel.releasePendingQc(workOrderID); // QC passed → labor now payable
  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED',
    qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);

  // QC PASS BILLS THE OWNING ARTISAN — EFD's infrastructure fee (§4c). Until this call existed,
  // `billWorkOrder` had zero callers: labor became payroll-payable here and nobody was ever charged
  // for it. Ordered AFTER the status write and never throwing, because QC pass is itself a committed
  // money event (labor is now credited) — a billing failure must not undo it.
  //
  // WHAT BILLS NOTHING: EFD-owned pieces (nobody to invoice), staff-owned pieces (EFD doesn't bill
  // EFD), and work orders whose labour is all `payer: 'self'` — an artisan's own hands on their own
  // piece. What DOES bill is any EFD-paid labour on an artisan's piece, which includes a CAD peer
  // review done by someone other than the owner even when the artisan did everything else themselves.
  // That is facilitated infrastructure, not rent on self-work. See workOrderBilling + laborPayer.
  // ENABLED (U-BILL-2). This was held back because a `work_order` invoice had no path to `paid` or
  // `void` — it would go overdue at +14 days and freeze the artisan out of mintRun / requestDesignCad /
  // casting-create with nothing in-product able to clear it. All three exits now exist:
  //   send  → POST /api/artisanInvoices/[invoiceID]/push-to-stripe (hosted Stripe invoice)
  //   paid  → Stripe `invoice.paid` → markArtisanInvoicePaid, or the manual mark-paid action
  //   void  → Stripe `invoice.voided`, or the void action
  // all surfaced on /dashboard/production/invoices. That satisfies the invariant castingSettlement
  // states: "every exit from an invoiced state must resolve the invoice."
  //
  // Never throws: QC pass is itself a committed money event (labor is credited above), so a billing
  // failure must not undo it — it returns { billed: false, reason }.
  const { billCompletedWorkOrder } = await import('@/services/production/workOrderBilling');
  const billing = await billCompletedWorkOrder({ workOrderID, createdBy: completedBy });

  // W3: piece work order passed QC → held labor is now payable. Notify the assigned artisan.
  try {
    if (wo.assignedToUserID) {
      await NotificationService.createNotification({
        userId: wo.assignedToUserID,
        type: 'wo-completed',
        title: 'Work order passed QC',
        message: `Your work order "${woLabel(wo)}" passed QC — your labor has been credited.`,
        channels: ['inApp'],
        priority: 'normal',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-completed notify failed:', e?.message || e);
  }

  // Was that the LAST open work order on a custom order? Then the piece is done —
  // advance the order to completed (guarded inside: bench phase only, forward-only).
  try {
    if (piece?.customOrderID) await maybeCompleteCustomOrder(piece.customOrderID);
  } catch (e) {
    console.error('[bench] custom-order completion check failed:', e?.message || e);
  }

  return { workOrder, piece, billing };
}
