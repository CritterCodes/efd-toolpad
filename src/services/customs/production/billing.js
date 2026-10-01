import PiecesModel from '@/app/api/pieces/model';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { advanceCustomOrderStatus } from '@/services/customs/customStatus';
import { NotificationService } from '@/lib/notificationService';
import { notifyAllAdmins } from '@/lib/notificationService';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { ADMIN_CUSTOM_LINK, DEFAULT_CLIENT_MGMT_BONUS_PCT, ensureCustomPiece } from './setup';
import { generateWorkOrdersFromQuote, getCustomWorkOrders } from './quoteSync';
/**
 * CASTING RECEIVED (C7 + realignment) — the workflow moment the cast metal arrives
 * with the vendor's invoice. Casting is a purchased input, so it:
 *  1. adds a material cost line to the piece (→ piece COGS → margin),
 *  2. writes a business-expense ledger entry,
 *  both stamped with the vendor's invoice number; and
 *  3. GENERATES the in-house bench work orders from the quote — you can't do bench
 *     work (cleanup, setting, polish) until the cast is in hand. Idempotent.
 */
export async function addCastingCost({ customID, amount, vendor = '', invoiceNumber = '', notes = '', paymentMethod = 'other', status = 'paid', createdBy = null }) {
  const amt = Number(amount);
  if (!(amt > 0)) { const e = new Error('Casting amount must be greater than zero.'); e.code = 'BAD_REQUEST'; throw e; }

  const { pieceID } = await ensureCustomPiece(customID, { createdBy });
  const material = {
    id: `cast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: vendor ? `Casting — ${vendor}` : 'Casting',
    unitCost: amt,
    qty: 1,
    vendor,
    invoiceNumber,
    notes,
  };
  // Idempotent: replace any prior casting line (don't double-count) so re-receiving
  // or correcting the casting invoice doesn't inflate piece COGS.
  const piece = await PiecesModel.upsertMaterialByCategory(pieceID, 'casting', material);

  // Lazy import to avoid a server-only model in the import graph until needed.
  const { default: BusinessExpensesModel } = await import('@/app/api/businessExpenses/model');
  // Mirror the idempotency on the ledger: update the existing casting expense for
  // this order rather than writing a second one.
  const expenseFields = {
    expenseDate: new Date(),
    vendor,
    category: 'Materials / Parts',
    amount: amt,
    invoiceNumber,
    paymentMethod,
    status,
    notes: notes || `Casting for custom ${customID}`,
    isDeductible: true,
    sourceReferenceType: 'custom_order',
    sourceReferenceID: customID,
    createdBy,
  };
  const existingExpense = await BusinessExpensesModel.findBySourceReference('custom_order', customID);
  const expense = existingExpense?.expenseID
    ? await BusinessExpensesModel.updateByExpenseID(existingExpense.expenseID, expenseFields)
    : await BusinessExpensesModel.create(expenseFields);

  // Casting is in hand → generate the in-house bench work orders from the quote (idempotent).
  const generation = await generateWorkOrdersFromQuote({ customID, createdBy: createdBy || 'system' });
  await CustomOrdersModel.updateById(customID, { castingReceivedAt: new Date() });

  // Cast metal in hand + bench WOs generated = the piece IS in production, whatever the
  // payment ledger says (the 50% rule usually got here first; this covers the rest).
  try {
    await advanceCustomOrderStatus(customID, 'in_production', { reason: 'casting received' });
  } catch (e) {
    console.error('⚠️ status advance to in_production failed:', e.message);
  }

  // X6 — casting received: alert the production-team artisans assigned to this order's
  // work orders that the cast metal is in hand and bench work can begin. If no WOs are
  // assigned yet (freshly generated WOs start unassigned), fall back to alerting admins.
  // Best-effort — never block recording the casting cost.
  try {
    const wos = await getCustomWorkOrders(customID);
    const assigneeIDs = [...new Set(wos.map((w) => w.assignedToUserID).filter(Boolean))];
    if (assigneeIDs.length) {
      for (const userId of assigneeIDs) {
        await NotificationService.createNotification({
          userId,
          type: 'custom-casting-received',
          title: 'Casting received — bench work can begin',
          message: `The casting for custom ${customID} has arrived. Your bench work is ready to start.`,
          channels: ['inApp'],
          priority: 'normal',
          data: { actionUrl: ADMIN_CUSTOM_LINK(customID), customID },
        });
      }
    } else {
      // No assigned artisans yet — surface to admins so someone routes the bench work.
      await notifyAllAdmins({
        type: 'custom-casting-received',
        title: 'Casting received',
        message: `Casting for custom ${customID} has arrived and bench work orders were generated.`,
        actionUrl: ADMIN_CUSTOM_LINK(customID),
        priority: 'normal',
        relatedData: { customID },
      });
    }
  } catch (e) {
    console.error('⚠️ custom-casting-received notification failed:', e.message);
  }

  return { piece, expense, generation };
}

/**
 * Award the client-management bonus (C8) when an order completes. The assigned
 * CAD designer earns `clientMgmtBonusPct` of the order's profit IF they managed
 * the client themselves — i.e. they authored ≥1 outbound client-thread message
 * (if admin did the communicating, no bonus). The bonus is logged as a flat-fee
 * labor entry on the CAD work order, so payroll pays it and it nets out of margin.
 * Idempotent (guarded by order.clientMgmtBonusAwarded).
 */
export async function awardClientMgmtBonus({ customID }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order || order.clientMgmtBonusAwarded) return null;

  const cad = (order.assignments || []).find((a) => a.role === 'cad' && a.userID);
  if (!cad) return null;

  const managedClient = (order.communications || []).some(
    (m) => (m.thread || 'client') === 'client' && m.direction === 'outbound' && m.authorUserID && m.authorUserID === cad.userID,
  );
  if (!managedClient) {
    await CustomOrdersModel.updateById(customID, { clientMgmtBonusAwarded: true, clientMgmtBonus: 0 });
    return { bonus: 0, eligible: false };
  }

  let pct = DEFAULT_CLIENT_MGMT_BONUS_PCT;
  try {
    const s = await SettingsManagerService.getSettings();
    const v = Number(s?.financial?.clientMgmtBonusPct);
    if (v >= 0 && v <= 1) pct = v;
  } catch { /* default */ }

  const margin = await CustomOrdersModel.marginFor(customID);
  const bonus = Math.round(Math.max(0, (margin?.margin || 0)) * pct * 100) / 100;

  if (bonus > 0) {
    const wos = await getCustomWorkOrders(customID);
    const target = wos.find((w) => w.discipline === DISCIPLINE.CAD) || wos[0];
    if (target) {
      await RepairLaborLogsModel.create({
        workOrderID: target.workOrderID, sourceType: target.sourceType, sourceID: target.sourceID,
        primaryJewelerUserID: cad.userID, primaryJewelerName: cad.name,
        creditedLaborHours: 0, creditedValue: bonus,
        sourceAction: 'client_mgmt_bonus', requiresAdminReview: false,
        notes: `Client-management bonus (${Math.round(pct * 100)}% of profit).`,
      });
      await PiecesModel.recomputeCosts(target.sourceID);
    }
  }

  await CustomOrdersModel.updateById(customID, { clientMgmtBonusAwarded: true, clientMgmtBonus: bonus, clientMgmtBonusUserID: cad.userID });
  return { bonus, eligible: true, designer: cad.name };
}

