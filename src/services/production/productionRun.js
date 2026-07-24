import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computePieceCosts } from '@/services/production/pieceCost';
import { EditionCapacityError, withEditionTransaction } from '@/services/production/editionCapacity';
import { assertArtisanNotFrozen } from '@/services/production/artisanBilling';
import { buildRun, RUN_STATUS } from '@/app/api/runs/model';

/**
 * Production Runs — the transactional core (PRODUCTION_RUNS.md §2, §4.1, §5).
 *
 * ONE service mints a run: it writes the run record, mints Σ qty edition-numbered Pieces against
 * the Design's edition cap, AND reserves the linked-gem editions each Piece consumes — all in a
 * SINGLE Mongo transaction, all-or-nothing. The gem reserve/release helpers are exported so
 * gemstone Phase 3 (S8) shares the exact same coupling (§5: "build once, both use it").
 *
 * Convention (identical to editionCapacity.js): public boundaries take `{ client, database, ... }`
 * and open the transaction via `withEditionTransaction`; internal workers take
 * `{ database, ..., session }` so they compose inside one transaction. WorkOrder spawning is NOT
 * part of this transaction (WorkOrdersModel is not session-aware and WOs are not capacity-critical)
 * — the route spawns them post-commit via `spawnRunWorkOrders`, matching how `createPieceFromDesign`
 * already separates piece creation from edition claiming.
 */

const CAP_EXPR = { $cond: [{ $eq: ['$edition.type', 'one_of_one'] }, 1, '$edition.limit'] };

/** Filter matching a design that can absorb `n` more edition slots (unlimited always matches). */
function canFitFilter(designID, n) {
  return {
    designID,
    $or: [
      { 'edition.type': 'unlimited' },
      {
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$edition.allocated', 0] }, { $ifNull: ['$edition.committed', 0] }, n] },
            CAP_EXPR,
          ],
        },
      },
    ],
  };
}

/** The gem stone-rows a jewelry variant consumes (rows carrying a linked gemDesignId). */
export function gemClaimsForVariant(variant = {}) {
  return (variant.gemstones || [])
    .filter((r) => r && r.gemDesignId)
    .map((r) => ({
      gemDesignId: r.gemDesignId,
      gemVariantId: r.gemVariantId ?? null,
      gemColor: r.gemColor ?? null,
      qty: Math.max(1, Number(r.qty) || 1),
    }));
}

/** Aggregate a list of per-piece gem-claim arrays into { gemDesignId → total qty } rows. */
export function aggregateGemClaims(perPieceClaims = []) {
  const totals = new Map();
  for (const claims of perPieceClaims) {
    for (const c of claims) {
      totals.set(c.gemDesignId, (totals.get(c.gemDesignId) || 0) + c.qty);
    }
  }
  return [...totals.entries()].map(([gemDesignId, qty]) => ({ gemDesignId, qty }));
}

/**
 * Reserve `qty` edition slots on each gem design (increments `edition.committed`). A reservation,
 * not an allocation — the gem is not cut until its gem_cutting WO (S8) converts committed→allocated.
 * Throws EditionCapacityError if any finite gem cannot absorb its qty. Unlimited gems never block.
 */
export async function reserveGemEditions({ database, gemClaims = [], session = null }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  for (const { gemDesignId, qty } of gemClaims) {
    const n = Math.max(1, Number(qty) || 1);
    const updated = await designs.findOneAndUpdate(
      canFitFilter(gemDesignId, n),
      { $inc: { 'edition.committed': n }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after', session },
    );
    if (!updated) throw new EditionCapacityError(`linked gem ${gemDesignId} has no capacity for ${n}`);
  }
}

/**
 * Release previously-reserved gem slots (decrements `edition.committed`, floored at zero via a
 * `$gte` guard). Best-effort mirror of reserveGemEditions used on scrap/cancel.
 */
export async function releaseGemEditions({ database, gemClaims = [], session = null }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  for (const { gemDesignId, qty } of gemClaims) {
    const n = Math.max(1, Number(qty) || 1);
    await designs.updateOne(
      { designID: gemDesignId, 'edition.committed': { $gte: n } },
      { $inc: { 'edition.committed': -n }, $set: { updatedAt: new Date() } },
      { session },
    );
  }
}

/** Build a well-formed piece document (parity with PiecesModel.create). Pure. */
function buildPieceDoc({ designID, design, variantId, editionNumber, resolvedConfiguration, gemClaims, runId, createdBy }) {
  const now = new Date();
  const actualMaterials = [];
  return {
    pieceID: randomUUID(),
    designID,
    variantId,
    resolvedConfiguration: structuredClone(resolvedConfiguration ?? {}),
    editionNumber,
    gemstoneId: design.gemstoneId ?? null,
    dropId: design.dropId ?? null,
    sku: null,
    serialNumber: null,
    metalType: null,
    karat: null,
    finish: null,
    ringSize: null,
    dimensions: null,
    weight: null,
    stones: [],
    actualMaterials,
    gemClaims: gemClaims ?? [],   // the linked-gem slots THIS piece reserved (release precisely on scrap)
    workOrderIDs: [],
    status: 'casting_ordered',    // minted into production (§2 stage 3)
    runId: runId ?? null,
    productID: null,
    customerID: null,
    customOrderID: null,
    billing: null,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy ?? null,
    ...computePieceCosts({ actualMaterials, laborLogs: [] }),
  };
}

/** Internal worker: mint the run + pieces + gem reservations inside a caller-provided session. */
export async function mintRunTx({ database, designID, items, createdBy, solo = true, resolvedConfigurations = {}, session }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const runs = database.collection(Constants.RUNS_COLLECTION);

  const design = await designs.findOne({ designID }, { session });
  if (!design) throw new EditionCapacityError(`design ${designID} not found`);

  // Expand items → one variantId per piece, and compute each piece's gem claims from its variant.
  const variantById = new Map((design.variants || []).map((v) => [v.variantId, v]));
  const pieceSpecs = [];
  for (const item of items || []) {
    const variant = variantById.get(item.variantId);
    if (!variant) throw new EditionCapacityError(`variant ${item.variantId} not on design ${designID}`);
    const claims = gemClaimsForVariant(variant);
    const qty = Math.max(1, Number(item.qty) || 1);
    for (let i = 0; i < qty; i += 1) {
      pieceSpecs.push({ variantId: item.variantId, gemClaims: claims, resolvedConfiguration: resolvedConfigurations[item.variantId] ?? {} });
    }
  }
  const total = pieceSpecs.length;
  if (total === 0) throw new EditionCapacityError('run has no pieces to mint');

  // 1) Reserve linked-gem editions FIRST (aggregate) — fail fast before touching jewelry capacity.
  const aggregateClaims = aggregateGemClaims(pieceSpecs.map((p) => p.gemClaims));
  await reserveGemEditions({ database, gemClaims: aggregateClaims, session });

  // 2) Block-allocate `total` edition numbers on the design, atomically under the cap.
  const before = await designs.findOneAndUpdate(
    canFitFilter(designID, total),
    { $inc: { 'edition.allocated': total, 'edition.nextNumber': total }, $set: { updatedAt: new Date() } },
    { returnDocument: 'before', session },
  );
  if (!before) throw new EditionCapacityError(`design ${designID} edition cannot absorb ${total} pieces`);
  const startNumber = before.edition?.nextNumber ?? 1;

  // 3) Insert the pieces with their assigned edition numbers.
  const pieceDocs = pieceSpecs.map((spec, i) => buildPieceDoc({
    designID, design, variantId: spec.variantId, editionNumber: startNumber + i,
    resolvedConfiguration: spec.resolvedConfiguration, gemClaims: spec.gemClaims, runId: null, createdBy,
  }));

  // 4) Build + insert the run doc, then stamp runId onto the pieces.
  const run = buildRun({
    designID, createdBy, solo, items,
    status: RUN_STATUS.CASTING,   // pieces are casting_ordered → run enters the casting stage
    pieceIDs: pieceDocs.map((p) => p.pieceID),
    gemClaims: aggregateClaims,
  });
  for (const p of pieceDocs) p.runId = run.runId;

  await pieces.insertMany(pieceDocs, { session });
  await runs.insertOne(run, { session });
  return { run, pieces: pieceDocs };
}

/** Public boundary: mint a run all-or-nothing. Frozen artisans (overdue bill) can't start new work. */
export async function mintRun({ client, database, ...input }) {
  await assertArtisanNotFrozen(input.createdBy, EditionCapacityError);
  return withEditionTransaction(client, (session) => mintRunTx({ database, ...input, session }));
}

/** Internal worker: scrap one pre-sale piece — release its edition slot + gem claims, retire its number. */
export async function scrapPieceTx({ database, pieceID, reason = null, session }) {
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const piece = await pieces.findOne({ pieceID }, { session });
  if (!piece) throw new EditionCapacityError('piece not found');
  const TERMINAL = ['sold', 'reserved', 'scrapped', 'cancelled'];
  if (TERMINAL.includes(piece.status)) throw new EditionCapacityError(`cannot scrap a ${piece.status} piece (pre-sale only)`);

  await pieces.updateOne(
    { pieceID },
    { $set: { status: 'scrapped', scrappedAt: new Date(), scrapReason: reason, updatedAt: new Date() } },
    { session },
  );
  // Release the edition SLOT (frees the cap so a replacement can be minted) but NOT nextNumber —
  // the scrapped number is retired; a replacement mint draws a fresh, higher number (§4.1).
  if (piece.editionNumber != null) {
    await designs.updateOne(
      { designID: piece.designID, 'edition.allocated': { $gte: 1 } },
      { $inc: { 'edition.allocated': -1 }, $set: { updatedAt: new Date() } },
      { session },
    );
  } else {
    await designs.updateOne(
      { designID: piece.designID, 'edition.committed': { $gte: 1 } },
      { $inc: { 'edition.committed': -1 }, $set: { updatedAt: new Date() } },
      { session },
    );
  }
  await releaseGemEditions({ database, gemClaims: piece.gemClaims || [], session });
  return { ...piece, status: 'scrapped' };
}

/** Public boundary: scrap a pre-sale piece. */
export function scrapPiece({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => scrapPieceTx({ database, ...input, session }));
}

/** Internal worker: cancel a whole run — release every non-terminal piece's slot + gems. */
export async function cancelRunTx({ database, runId, session }) {
  const runs = database.collection(Constants.RUNS_COLLECTION);
  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const run = await runs.findOne({ runId }, { session });
  if (!run) throw new EditionCapacityError('run not found');

  const TERMINAL = ['sold', 'reserved', 'scrapped', 'cancelled'];
  const cancelled = [];
  const skipped = [];
  for (const pieceID of run.pieceIDs || []) {
    const piece = await pieces.findOne({ pieceID }, { session });
    if (!piece) { skipped.push(pieceID); continue; }
    if (TERMINAL.includes(piece.status)) { skipped.push(pieceID); continue; }
    await pieces.updateOne(
      { pieceID },
      { $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } },
      { session },
    );
    if (piece.editionNumber != null) {
      await designs.updateOne(
        { designID: piece.designID, 'edition.allocated': { $gte: 1 } },
        { $inc: { 'edition.allocated': -1 }, $set: { updatedAt: new Date() } },
        { session },
      );
    } else {
      await designs.updateOne(
        { designID: piece.designID, 'edition.committed': { $gte: 1 } },
        { $inc: { 'edition.committed': -1 }, $set: { updatedAt: new Date() } },
        { session },
      );
    }
    await releaseGemEditions({ database, gemClaims: piece.gemClaims || [], session });
    cancelled.push(pieceID);
  }
  await runs.updateOne({ runId }, { $set: { status: RUN_STATUS.CANCELLED, updatedAt: new Date() } }, { session });
  return { runId, cancelled, skipped, status: RUN_STATUS.CANCELLED };
}

/** Public boundary: cancel a run. */
export function cancelRun({ client, database, ...input }) {
  return withEditionTransaction(client, (session) => cancelRunTx({ database, ...input, session }));
}
