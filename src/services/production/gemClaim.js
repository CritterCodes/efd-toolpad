import Constants from '@/lib/constants';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { estimateGemstoneCost, gemTierRate } from '@/services/production/designCost';

/**
 * Gemstone Phase 3 — claim-time (GEMSTONE_DESIGNS_AND_INVENTORY.md §2/§3, PRODUCTION_RUNS.md §4d).
 * When a linked gem is actually going to be cut (its jewelry piece enters production, or the gem is
 * ordered directly), the reservation the run took at mint (S1: `edition.committed`) is converted to
 * `allocated`, a `gem_cutting` work order is spawned carrying the target spec, the price is
 * authoritatively re-resolved at the actual carat, and (at sale) the cutter's payout is netted of
 * any rough EFD fronted. This is the first thing that spawns into the `gem_cutting` lane.
 */

export class GemClaimError extends Error {}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Authoritative reprice at claim (guards against stale/served prices). PURE.
 * Resolves the color bucket's rough rate at the ACTUAL carat (strict tiers) → material+labor cost.
 * Returns `{ priceable:false, reason }` when the carat is beyond the color's tiers (special request).
 */
export function repriceGemAtClaim({ gemstone = {}, colorLabel, carat }) {
  const color = (gemstone.colors || []).find((c) => c.label === colorLabel);
  if (!color) return { priceable: false, reason: 'unknown color bucket' };
  const rate = gemTierRate(color.rates, carat);
  if (rate == null) return { priceable: false, reason: 'carat beyond the color’s tiers — special request' };
  const cost = estimateGemstoneCost({ carat, roughRatePerCarat: rate, yield: gemstone.yield, cutLaborCost: gemstone.cutLaborCost });
  return { priceable: true, ...cost };
}

/**
 * Enforce a variant's sub-caps at claim. PURE.
 * `maxPieces` = this species' slice of the design edition; `lotQty` = fixed quantity of special
 * rough. The effective cap is the smaller of whichever are set; unset = uncapped by this check
 * (the design edition still bounds it). `alreadyClaimed` = pieces already committed+allocated to
 * this variant.
 */
export function gemClaimWithinCaps({ gemstone = {}, alreadyClaimed = 0, adding = 1 }) {
  const caps = [gemstone.maxPieces, gemstone.lotQty].map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  if (caps.length === 0) return { ok: true, cap: null };
  const cap = Math.min(...caps);
  const ok = (Number(alreadyClaimed) || 0) + (Number(adding) || 1) <= cap;
  return { ok, cap, reason: ok ? null : `variant cap of ${cap} reached` };
}

/**
 * Cutter's consignment payout, NET of any rough EFD fronted (§4d — "deduct the fronted rough"). PURE.
 * payout = gross − EFD consignment − fronted rough (floored at 0).
 */
export function cutterPayoutNetOfRough({ grossSale = 0, consignmentRate = 0, frontedRoughCost = 0 }) {
  const gross = Number(grossSale) || 0;
  const consignmentAmount = round2(gross * (Number(consignmentRate) || 0));
  const fronted = Number(frontedRoughCost) || 0;
  return {
    grossSale: round2(gross),
    consignmentAmount,
    frontedRoughCost: round2(fronted),
    payoutAmount: round2(Math.max(0, gross - consignmentAmount - fronted)),
  };
}

/**
 * Convert a gem's RESERVED slot to ALLOCATED (it's being cut now). Single-doc atomic guard — no
 * transaction needed. Throws if there's no reserved capacity to claim.
 */
export async function claimGemEdition({ database, gemDesignId, qty = 1, session = null }) {
  const designs = database.collection(Constants.DESIGNS_COLLECTION);
  const n = Math.max(1, Number(qty) || 1);
  const updated = await designs.findOneAndUpdate(
    { designID: gemDesignId, 'edition.committed': { $gte: n } },
    { $inc: { 'edition.committed': -n, 'edition.allocated': n }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after', session },
  );
  if (!updated) throw new GemClaimError(`gem ${gemDesignId} has no reserved capacity to claim`);
  return updated;
}

/** Build the target spec a cutter needs (species/color + size). PURE. */
export function gemCutTarget({ gemstone = {}, claim = {}, resolvedConfiguration = {} }) {
  const rc = resolvedConfiguration || {};
  return {
    sizeMode: rc.sizeMode || (rc.targetMm ? 'dimensions' : 'carat'),
    species: gemstone.species ?? null,
    color: claim.gemColor ?? rc.color ?? null,
    carat: rc.carat ?? rc.finalCarat ?? null,
    targetMm: rc.targetMm ?? null,       // set for cut-to-fit (jewelry setting) — Phase 4 shop customizer refines
    tolerance: rc.tolerance ?? null,
    creation: gemstone.naturalSynthetic === 'lab' ? 'lab' : 'natural',
    treatment: gemstone.treatment ?? null,
  };
}

/** Spawn a gem_cutting work order for one gem claim, carrying the target spec. */
export async function spawnGemCuttingWO({ pieceID, gemDesignId, gemVariantId, target, cutterUserID = null, createdBy = null }) {
  return WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
    sourceID: pieceID,
    discipline: DISCIPLINE.GEM_CUTTING,
    title: `Gem cut — ${target?.species || 'stone'}${target?.color ? ` (${target.color})` : ''}`,
    description: target?.targetMm ? `Cut to fit: ${target.targetMm}mm ±${target.tolerance ?? '?'}` : (target?.carat ? `Target: ${target.carat}ct` : null),
    status: cutterUserID ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID: cutterUserID || null,
    claimedAt: cutterUserID ? new Date() : null,
    tasks: [{ process: 'gem_cut', gemDesignId, gemVariantId, target }],
    createdBy,
  });
}

/**
 * For a run/production piece that consumes linked gems: claim each gem's edition (committed→
 * allocated) and spawn a gem_cutting WO carrying the target. Best-effort per claim — the gem design
 * doc supplies species/treatment; the piece's resolvedConfiguration supplies size. Returns the
 * spawned WO ids.
 */
export async function claimGemsForPiece({ database, piece, gemDocs = {}, createdBy = null }) {
  const woIDs = [];
  for (const claim of piece.gemClaims || []) {
    if (!claim?.gemDesignId) continue;
    await claimGemEdition({ database, gemDesignId: claim.gemDesignId, qty: claim.qty || 1 });
    const gemDesign = gemDocs[claim.gemDesignId];
    const variant = (gemDesign?.variants || []).find((v) => v.variantId === claim.gemVariantId);
    const gemstone = variant?.gemstone || {};
    const target = gemCutTarget({ gemstone, claim, resolvedConfiguration: piece.resolvedConfiguration });
    const wo = await spawnGemCuttingWO({
      pieceID: piece.pieceID, gemDesignId: claim.gemDesignId, gemVariantId: claim.gemVariantId,
      target, cutterUserID: gemDesign?.primaryArtisanId || null, createdBy,
    });
    woIDs.push(wo.workOrderID);
  }
  return woIDs;
}
