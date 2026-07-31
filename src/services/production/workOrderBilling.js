import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { owningArtisanForPiece } from '@/services/production/laborPayer';
import { billWorkOrder, isEfdSelf } from '@/services/production/artisanBilling';

/**
 * WORK-ORDER COMPLETION BILLING (§4c, §4.4) — the infra fee, collected at last.
 *
 * `billWorkOrder` has existed since S5 with ZERO callers: work orders passed QC, labor became
 * payroll-payable, and nobody was ever charged. EFD paid the bench and invoiced nothing. This is the
 * caller. `laborPayer.js` already documented the intent — *"'efd' (EFD pays payroll **and bills the
 * owning artisan at completion**)"* — it was simply never wired.
 *
 * ─── WHAT GETS BILLED, AND WHY NOT MORE ───────────────────────────────────────
 *
 * LABOR ONLY, and only this work order's own labor.
 *
 *  • Per WORK ORDER, not per piece. Labor logs are keyed by `workOrderID` with a `creditedValue`, so
 *    a WO's labor is attributable. `computePieceCosts` deliberately is NOT used — it sums the whole
 *    PIECE, so billing from it would charge the entire piece once for every work order on it.
 *
 *  • `payer: 'self'` labor is EXCLUDED. That's the artisan working on their own piece; it is not
 *    payroll-payable and realizes at sale via consignment (§4.4). Billing it would charge someone for
 *    their own hands. `payer: 'efd'` is the billable case: EFD paid a third party to do work on the
 *    owner's piece.
 *
 *  • MATERIALS ARE NOT BILLED HERE, on purpose. Materials live on the piece by category, not on a
 *    work order, so they cannot be attributed to one. More importantly casting — the big one — is
 *    ALREADY invoiced separately at cost when the batch is received (`castingSettlement`). Adding
 *    piece materials here would double-bill it. If per-WO material attribution is ever added, check
 *    that interaction first.
 *
 *  • `pendingQc` logs are excluded — labor held pending QC isn't real yet. In practice
 *    `releasePendingQc` runs immediately before this on the same work order, so they'll have cleared.
 *
 * NEVER THROWS. QC pass is a committed money event (it credits the artisan's labor); a billing
 * failure must not roll it back or 500 the bench action. Returns a status object instead.
 */

/** Sum the billable (EFD-paid, QC-released) labor on one work order. PURE. */
export function billableLabor(logs = []) {
  return (logs || [])
    .filter((l) => l && l.payer !== 'self' && l.pendingQc !== true)
    .reduce((sum, l) => sum + (Number(l.creditedValue) || 0), 0);
}

/**
 * Bill the owning artisan for a work order that just passed QC.
 * @returns {{billed:boolean, invoiceID?:string, amount?:number, reason?:string, error?:true}}
 */
export async function billCompletedWorkOrder({ workOrderID, createdBy = null }) {
  try {
    const wo = await WorkOrdersModel.findByID(workOrderID);
    if (!wo) return { billed: false, reason: 'work order not found' };

    // Repairs bill the CUSTOMER through repair closeout, and sale-service WOs are covered by the
    // sale. Only piece work belongs to an artisan's ledger.
    const PIECE_SOURCES = [WORK_ORDER_SOURCE.PRODUCTION_PIECE, WORK_ORDER_SOURCE.CUSTOM_PIECE];
    if (!PIECE_SOURCES.includes(wo.sourceType)) {
      return { billed: false, reason: `${wo.sourceType} work orders are not artisan-billed` };
    }

    const owner = await owningArtisanForWorkOrder(wo);
    // No owning artisan = EFD-owned work. EFD has nobody to invoice.
    if (!owner) return { billed: false, reason: 'EFD-owned piece — no artisan to bill' };

    // EFD doesn't bill EFD (owner's call 2026-07-29) — same rule casting uses.
    if (await isEfdSelf(owner)) return { billed: false, reason: 'owner is EFD staff — not billed' };

    const logs = await RepairLaborLogsModel.findByWorkOrder(workOrderID);
    const labor = billableLabor(logs);
    if (labor <= 0) {
      return { billed: false, reason: 'no EFD-paid labor on this work order (solo work bills nothing)' };
    }

    const invoice = await billWorkOrder({
      workOrderID,
      billedUserID: owner,
      billedEmail: await emailFor(owner),
      runId: wo.runId ?? null,
      labor,
      // See the header: materials/shipping/gems are not attributable per WO and casting is already
      // invoiced at cost elsewhere.
      materials: 0,
      description: wo.title ? `Work order — ${wo.title}` : 'Work order',
      createdBy,
    });
    if (!invoice) return { billed: false, reason: 'nothing owed after markup' };
    return { billed: true, invoiceID: invoice.invoiceID, amount: invoice.amount };
  } catch (e) {
    console.error('[bench] work-order billing failed:', e?.message || e);
    return {
      billed: false,
      error: true,
      reason: `The work order passed QC and labor was credited, but its invoice could not be created: ${e?.message || e}.`,
    };
  }
}

/** The artisan whose ledger this work order's piece belongs to (null = EFD-owned). */
async function owningArtisanForWorkOrder(wo) {
  const [{ default: PiecesModel }, { default: DesignsModel }, { default: DropsModel }] = await Promise.all([
    import('@/app/api/pieces/model'),
    import('@/app/api/designs/model'),
    import('@/app/api/drops/model'),
  ]);
  const piece = await PiecesModel.findById(wo.sourceID);
  if (!piece) return null;
  const [design, drop] = await Promise.all([
    piece.designID ? DesignsModel.findById(piece.designID) : null,
    piece.dropId ? DropsModel.findById(piece.dropId) : null,
  ]);
  // Same resolution the labor payer uses, so who is BILLED and who is paid SELF can never disagree.
  return owningArtisanForPiece({ drop, design });
}

/** Billing email for the invoice (missing is not fatal — the row still exists). */
async function emailFor(userID) {
  try {
    const { db } = await import('@/lib/database');
    const dbInstance = await db.connect();
    const user = await dbInstance.collection('users').findOne(
      { userID: String(userID) },
      { projection: { _id: 0, email: 1 } },
    );
    return user?.email || null;
  } catch {
    return null;
  }
}
