import { adminBase } from '@/lib/appUrls';
import { randomUUID } from 'crypto';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import DesignsModel from '@/app/api/designs/model';
import { DESIGN_STATUS } from '@/app/api/designs/model';
import { createPieceFromDesign } from '@/services/production/pieceRouting';
import PiecesModel from '@/app/api/pieces/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { db } from '@/lib/database';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { advanceCustomOrderStatus } from '@/services/customs/customStatus';
import { NotificationService } from '@/lib/notificationService';
import { getCustomTaskLine } from '@/services/customs/customTasks';
import { mergeAutoLaborLine } from '@/services/customs/customTasks';
export const ADMIN_CUSTOM_LINK = (customID) => `${adminBase()}/dashboard/customs/${customID}`;

export const DEFAULT_CLIENT_MGMT_BONUS_PCT = 0.05;

/**
 * A custom order is a bespoke one-off with no catalog variant, but a Design still needs
 * ≥1 Variant and a Piece must reference a real variantId (catalog contract §6/§7). Give
 * the custom's design a single default variant with a unique SKU so the piece references
 * an actual variant (not a dangling synthetic id).
 */
export function defaultCustomVariant(customID) {
  const suffix = randomUUID().slice(0, 8);
  return { variantId: `custom-${customID}-${suffix}`, sku: `CUSTOM-${customID}-${suffix}`, active: true };
}

export async function addProductionToCustomOrder(customID, opts = {}) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');

  // Use an existing design or create one from the order.
  let designID = opts.designID || null;
  let design = designID ? await DesignsModel.findById(designID) : null;
  if (!design) {
    design = await DesignsModel.create({
      name: order.title || `Custom ${customID}`,
      description: order.description ?? null,
      // DESIGN_STATUS has no CAD member — this read `DESIGN_STATUS.CAD` (undefined) and create()'s
      // `|| DRAFT` fallback quietly made it a draft. Say what it actually is.
      status: DESIGN_STATUS.DRAFT,
      routing: Array.isArray(opts.routing) ? opts.routing : [],
      variants: [defaultCustomVariant(customID)],
      createdBy: opts.createdBy ?? null,
    });
    designID = design.designID;
  }

  const piece = await createPieceFromDesign(designID, {
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    customerID: order.clientID ?? null,
    customOrderID: customID,
    billing: order.billing ?? { mode: 'retail' },
    createdBy: opts.createdBy ?? null,
  });

  const updatedOrder = await CustomOrdersModel.linkProduction(customID, { designID, pieceID: piece.pieceID });
  return { design, piece, order: updatedOrder };
}

/**
 * Ensure the custom order has a Piece to hang work orders on — WITHOUT spawning
 * any default work orders (unlike createPieceFromDesign). The custom spine adds
 * work orders incrementally per stage (C6), so the piece starts bare.
 */
export async function ensureCustomPiece(customID, opts = {}) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  if ((order.pieceIDs || []).length) return { pieceID: order.pieceIDs[0], order };

  const variant = defaultCustomVariant(customID);
  const design = await DesignsModel.create({
    name: order.title || `Custom ${customID}`,
    description: order.description ?? null,
    // Same undefined-constant trap as addProductionToCustomOrder above.
    status: DESIGN_STATUS.DRAFT,
    routing: [],
    variants: [variant],
    createdBy: opts.createdBy ?? null,
  });
  const piece = await PiecesModel.create({
    designID: design.designID,
    // References the design's real default variant (created above). Config carries the
    // order's spec since a custom is bespoke.
    variantId: variant.variantId,
    resolvedConfiguration: { metalType: order.metalType ?? null, karat: order.karat ?? null, size: order.size ?? null },
    metalType: order.metalType ?? null,
    karat: order.karat ?? null,
    customerID: order.clientID ?? null,
    customOrderID: customID,
    billing: order.billing ?? { mode: 'retail' },
    createdBy: opts.createdBy ?? null,
  });
  const updatedOrder = await CustomOrdersModel.linkProduction(customID, { designID: design.designID, pieceID: piece.pieceID });
  return { pieceID: piece.pieceID, order: updatedOrder };
}

/**
 * Spawn ONE work order onto the custom's piece in a chosen discipline (the
 * incremental, per-stage spine: CAD → casting → bench cleanup → setting → …).
 * Optionally pre-assigned (e.g. the CAD designer at assignment time).
 */
export async function spawnCustomWorkOrder({
  customID, discipline = DISCIPLINE.BENCH_JEWELRY, title = null, cadStage = null,
  assignedToUserID = null, assignedJeweler = null, estLaborHours = 0, process = null, tasks = null, flatFee = 0, createdBy = null,
  assignmentId = null,
  // Which piece this work order belongs to. Defaults to the order's jewelry piece, which is what
  // every existing caller wants. A custom can now carry more than one component — a commissioned
  // stone is its own gemstone Design + Piece (services/customs/customGemComponent.js) — and its cut
  // work order has to hang off THE STONE, not off the ring.
  pieceID: pieceIDOverride = null,
}) {
  const { pieceID } = pieceIDOverride
    ? { pieceID: pieceIDOverride }
    : await ensureCustomPiece(customID, { createdBy });
  const piece = await PiecesModel.findById(pieceID);
  const seq = (piece.workOrderIDs?.length || 0) + 1;

  // Resolve the assignee's name + (for CAD) their flat design fee from the profile
  // when only a userID is supplied (e.g. assigning a GLB stage from the UI).
  let resolvedName = assignedJeweler;
  let resolvedFee = Number(flatFee) || 0;
  if (assignedToUserID && (!resolvedName || (discipline === DISCIPLINE.CAD && !resolvedFee))) {
    const dbi = await db.connect();
    const u = await dbi.collection('users').findOne({ userID: assignedToUserID }, { projection: { _id: 0, firstName: 1, lastName: 1, name: 1, email: 1, artisanApplication: 1 } });
    if (u) {
      if (!resolvedName) resolvedName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.email || assignedToUserID;
      if (discipline === DISCIPLINE.CAD && !resolvedFee) resolvedFee = Number(u.artisanApplication?.customDesignFee) || 0;
    }
  }

  const wo = await WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
    sourceID: pieceID,
    seq,
    discipline,
    cadStage: discipline === DISCIPLINE.CAD ? (cadStage || 'design') : null,
    title: title || `Custom ${customID} — ${discipline}`,
    status: assignedToUserID ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID,
    assignedJeweler: resolvedName,
    claimedAt: assignedToUserID ? new Date() : null,
    flatFee: resolvedFee,
    // Multiple bundled tasks (one WO per lane) when `tasks` is supplied; else the single
    // process/estLaborHours form. The WO's tasks[] hours drive the bench payout (sum × rate).
    tasks: Array.isArray(tasks) && tasks.length
      ? tasks.map((t) => ({ process: t.process || discipline, estLaborHours: Number(t.estLaborHours) || 0 }))
      : ((process || Number(estLaborHours) > 0) ? [{ process: process || discipline, estLaborHours: Number(estLaborHours) || 0 }] : []),
    createdBy,
    // Which assignment spawned this. Without it an assignment and its work order are unpairable,
    // so removing the assignment leaves an orphan on somebody's bench.
    assignmentId,
  });
  await PiecesModel.setWorkOrders(pieceID, [...(piece.workOrderIDs || []), wo.workOrderID]);

  // CAD work now exists on this order → it is in the design stage (forward-only; a GLB
  // stage spawned later, when the order already sits in deposit/production, is a no-op).
  if (discipline === DISCIPLINE.CAD) {
    try {
      await advanceCustomOrderStatus(customID, 'design', { reason: 'CAD work order created' });
    } catch (e) {
      console.error('⚠️ status advance to design failed:', e.message);
    }
  }

  // X7 — if this WO was spawned pre-assigned (e.g. the CAD/GLB designer at assignment
  // time), notify that artisan. Unassigned WOs (claimed later at the bench) skip this —
  // the claim itself notifies (W1). Best-effort; never block the spawn.
  if (assignedToUserID) {
    try {
      await NotificationService.createNotification({
        userId: assignedToUserID,
        type: 'custom-wo-assigned',
        title: 'New work order assigned',
        message: `You've been assigned "${wo.title}" for custom ${customID}.`,
        channels: ['inApp', 'push'],
        priority: 'normal',
        data: { actionUrl: ADMIN_CUSTOM_LINK(customID), customID, workOrderID: wo.workOrderID },
      });
    } catch (e) {
      console.error('⚠️ custom-wo-assigned notification failed:', e.message);
    }
  }

  // A GLB-stage CAD work order is a billable design opportunity — add a "GLB Creation"
  // labor line from the custom task catalog (priced like any task; falls back to the
  // designer's resolved fee if the seed hasn't run) so the client is charged for it.
  // It's a labor line, not a separate glbFee field — GLB is modeled as work (C4/C6).
  if (discipline === DISCIPLINE.CAD && cadStage === 'glb') {
    const order = await CustomOrdersModel.findById(customID);
    if (order) {
      const glbLine = await getCustomTaskLine('GLB Creation', { autoKey: 'custom-glb', fallbackCost: resolvedFee, passThrough: true });
      const laborTasks = mergeAutoLaborLine(order.quote?.laborTasks, glbLine);
      await CustomOrdersModel.updateById(
        customID,
        { quote: { ...order.quote, laborTasks } },
        { changedBy: createdBy, reason: 'glb work order created' },
      );
    }
  }

  // A design-stage CAD work order means the piece will be CAST — and every casting gets
  // cleaned up at the bench. Pre-fill the "Clean up Casting" labor line (same recipe the
  // designs quote maker uses: catalog price, fallback if the seed hasn't run) so the
  // quote never forgets the cleanup. Unlike the CAD/GLB/QC lines this is REAL bench
  // work: it keeps the bench discipline and spawns a work order at casting received.
  if (discipline === DISCIPLINE.CAD && (cadStage || 'design') === 'design') {
    const order = await CustomOrdersModel.findById(customID);
    if (order && !(order.quote?.laborTasks || []).some((t) => t.autoKey === 'auto-casting-cleanup')) {
      const cleanupLine = await getCustomTaskLine('Clean up Casting', {
        autoKey: 'auto-casting-cleanup', fallbackCost: 40,
        discipline: DISCIPLINE.BENCH_JEWELRY, noWorkOrder: false,
      });
      const laborTasks = mergeAutoLaborLine(order.quote?.laborTasks, cleanupLine);
      await CustomOrdersModel.updateById(
        customID,
        { quote: { ...order.quote, laborTasks } },
        { changedBy: createdBy, reason: 'cad work order created — casting cleanup pre-filled' },
      );
    }
  }
  return wo;
}

