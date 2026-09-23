/**
 * A custom-cut stone is a PRODUCT, not a line of labour (owner, 2026-09-23: "it should essentially be
 * a route similar to Jacob adding a gemstoned design").
 *
 * WHAT WAS WRONG. A custom order spawned one stub Design (no category, one synthetic variant, named
 * "Custom CO-…") and one Piece, and every discipline's work order hung off that single piece. So a
 * commissioned stone had no identity: nowhere for its species/cut/target size to live, nothing to
 * price, nothing to link to the ring, and its cost reached the quote only as a number someone typed
 * into `quote.centerstone.cost`. Meanwhile gemstone DESIGNS already carry exactly the right shape —
 * the cut is the design, each variant is a species offering with a size guard.
 *
 * WHAT THIS DOES. Gives the stone its own gemstone Design + its own Piece on the same custom order,
 * and hangs the gem_cutting work order off THE STONE, not off the ring. The order's `designIDs` /
 * `pieceIDs` were already arrays and `linkProduction` already uses `$addToSet`, so a custom carrying
 * several components needs no schema change — only `ensureCustomPiece`'s `pieceIDs[0]` assumed one,
 * and that path is left exactly as it is for the jewelry component.
 *
 * `availability: 'special_request'` is the honest setting for a commission: it IS quoted by request,
 * and it is also what the design validator requires when a variant carries no rate tiers (a one-off
 * has none — the price comes from the cutter, not from a published table).
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not decide how the cutter gets PAID. Today the gem work
 * order credits cut labour to him at QC, exactly as before. If a stone price that already includes his
 * bench time is ALSO ported into the quote, those two are double counting — that is an owner ruling
 * (consignment per GEMSTONE_DESIGNS_AND_INVENTORY §2b, or labour on the work order), and
 * `setStonePrice` records where the number came from so the decision can be made on real data.
 */
import { randomUUID } from 'crypto';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import DesignsModel, { DESIGN_STATUS, EDITION_TYPE } from '@/app/api/designs/model';
import PiecesModel, { PIECE_STATUS } from '@/app/api/pieces/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { spawnCustomWorkOrder } from '@/services/customs/customProduction';
import { ASSIGNMENT_ROLE } from '@/services/customs/customAssignment';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const list = (v) => (Array.isArray(v) ? v : [v]).map((x) => String(x || '').trim()).filter(Boolean);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

/** Pure: a human title for the stone — what the cutter sees on the bench and the client on the quote. */
export function stoneTitle(stone = {}) {
  const size = stone.sizeMode === 'dimensions' && num(stone.targetMm)
    ? `${num(stone.targetMm)}mm`
    : num(stone.carat) ? `${num(stone.carat)}ct` : '';
  return [size, ...list(stone.cut), stone.colorLabel, stone.species].filter(Boolean).join(' ') || 'Custom cut stone';
}

/**
 * Pure: the cutter's target, recorded on the Piece (GEMSTONE_DESIGNS_AND_INVENTORY §2 — "the edited
 * field is the order's PRIMARY spec"). `finalCarat` stays null until the stone is actually cut, which
 * is what a true-up at final weight would later read.
 */
export function stoneConfiguration(stone = {}) {
  const sizeMode = stone.sizeMode === 'dimensions' ? 'dimensions' : 'carat';
  return {
    sizeMode,
    species: String(stone.species || '').trim(),
    color: String(stone.colorLabel || '').trim() || null,
    cut: list(stone.cut),
    cutStyle: list(stone.cutStyle),
    carat: num(stone.carat),
    finalCarat: null,
    targetMm: num(stone.targetMm),
    tolerance: num(stone.tolerance),
    naturalSynthetic: stone.naturalSynthetic || 'natural',
    clarity: stone.clarity || null,
    treatment: stone.treatment || null,
    // Cut-to-fit is its own, slower job (doc §2) — worth carrying so the bench card can say so.
    cutToFit: sizeMode === 'dimensions',
  };
}

/** Pure: the gemstone Design document for a one-off commission. Mirrors a listed gemstone design. */
export function buildStoneDesign(stone = {}, { customID, cutterUserID = null, createdBy = null } = {}) {
  const species = String(stone.species || '').trim();
  if (!species) throw new Error('A custom cut stone needs a species.');
  const suffix = randomUUID().slice(0, 8);
  const carat = num(stone.carat);
  return {
    name: stoneTitle(stone),
    description: stone.notes || null,
    category: 'gemstone',
    // The CUT is the design; the material spec lives on the variant.
    gemstone: { cut: list(stone.cut), cutStyle: list(stone.cutStyle) },
    // A commission is not a catalog listing; it becomes real when the stone is cut.
    status: DESIGN_STATUS.DRAFT,
    // A commissioned stone is by definition the only one of itself.
    edition: { type: EDITION_TYPE.ONE_OF_ONE, allocated: 0, committed: 0, nextNumber: 1, freedNumbers: [] },
    primaryArtisanId: cutterUserID,
    routing: [],
    variants: [{
      variantId: `gem-${customID}-${suffix}`,
      sku: `GEM-${customID}-${suffix}`.toUpperCase(),
      label: species,
      active: true,
      pricing: { retailPrice: null },
      gemstone: {
        species,
        // A one-off is quoted by request — it carries no rate tiers, and the validator requires
        // this setting when it cannot price a whole advertised range.
        availability: 'special_request',
        // The commission's target doubles as its range: this stone, not a size menu.
        caratMin: carat,
        caratMax: carat,
        naturalSynthetic: stone.naturalSynthetic || 'natural',
        clarity: stone.clarity || null,
        treatment: stone.treatment || null,
        cutLaborCost: num(stone.cutLaborCost),
        yield: num(stone.yield),
        colors: [],
        ratesUpdatedAt: null,
      },
    }],
    createdBy,
  };
}

/**
 * Add a commissioned stone to a custom order: its own gemstone Design, its own Piece, and a
 * gem_cutting work order hung off THAT piece. Returns the three.
 */
export async function addCustomCutStone({ customID, stone = {}, cutterUserID = null, createdBy = null } = {}) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');

  // The cutter comes from the order's ASSIGNMENTS, not from a free pick (owner, 2026-09-23: "he gets
  // added as an artisan on the custom order"). Being assigned is what gives him comms access and puts
  // him on the job; a stone handed to somebody who is not on the order would be work nobody agreed to.
  // A stone with no cutter yet is fine — its cut work order simply sits unclaimed.
  const assignment = cutterUserID
    ? (order.assignments || []).find((a) => a.userID === cutterUserID && a.role === ASSIGNMENT_ROLE.STONE)
    : null;
  if (cutterUserID && !assignment) {
    throw new Error('That cutter is not assigned to this order. Assign them as a stone cutter first.');
  }

  const designData = buildStoneDesign(stone, { customID, cutterUserID, createdBy });
  const design = await DesignsModel.create(designData);
  const variant = design.variants[0];

  const piece = await PiecesModel.create({
    designID: design.designID,
    variantId: variant.variantId,
    resolvedConfiguration: stoneConfiguration(stone),
    status: PIECE_STATUS.PLANNED,
    customerID: order.clientID ?? null,
    customOrderID: customID,
    billing: order.billing ?? { mode: 'retail' },
    createdBy,
  });

  await CustomOrdersModel.linkProduction(customID, { designID: design.designID, pieceID: piece.pieceID });

  // The cut work order belongs to the STONE. Hanging it off the ring's piece is what made a
  // commissioned stone indistinguishable from a labour line in the first place.
  const workOrder = await spawnCustomWorkOrder({
    customID,
    discipline: DISCIPLINE.GEM_CUTTING,
    title: `Cut ${stoneTitle(stone)}`,
    assignedToUserID: cutterUserID,
    createdBy,
    pieceID: piece.pieceID,
    assignedJeweler: assignment?.name || null,
    // Pairs the cut work order with the assignment, so unassigning the cutter can release it
    // (customAssignment.releaseStoneWorkOrders) instead of leaving it on a stranger's bench.
    assignmentId: assignment?.id || null,
  });

  return { design, piece, workOrder };
}

/**
 * Record what the stone costs and port it into the ring's quote.
 *
 * `quote.centerstone` has always been `{ item, cost }` typed by hand. It now also carries where the
 * number came from, so the quote can be read back to the stone that produced it instead of being a
 * bare number nobody can audit.
 */
export async function setStonePrice({ customID, pieceID, price, quotedBy = null, note = '', applyToQuote = true } = {}) {
  const amount = round2(price);
  if (!(amount > 0)) throw new Error('A stone price must be greater than zero.');

  const piece = await PiecesModel.findById(pieceID);
  if (!piece || piece.customOrderID !== customID) throw new Error('That stone is not part of this custom order.');

  const quotedAt = new Date();
  await PiecesModel.updateById(pieceID, {
    stonePrice: { amount, quotedBy, quotedAt, note: String(note || '') },
    updatedAt: quotedAt,
  });

  if (!applyToQuote) return { pieceID, amount, appliedToQuote: false };

  const design = piece.designID ? await DesignsModel.findById(piece.designID) : null;
  const centerstone = {
    item: design?.name || stoneTitle(piece.resolvedConfiguration || {}),
    cost: amount,
    // Derived, not typed — the audit trail the old free-text field never had.
    sourcePieceID: pieceID,
    sourceDesignID: piece.designID ?? null,
    quotedBy,
    quotedAt,
  };
  // A PARTIAL quote: updateById merges it onto the existing quote and recomputes the totals
  // (normalizeQuote → computeQuote), including the centre-stone's own markup. Passing the whole
  // quote back would be the subdoc-replace trap.
  const updated = await CustomOrdersModel.updateById(customID, { quote: { centerstone } });
  return { pieceID, amount, appliedToQuote: true, centerstone, quoteTotal: updated?.quote?.quoteTotal ?? null };
}

/** The stone components of a custom order (its gemstone-design pieces). */
export async function stoneComponentsFor(customID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return [];
  const pieceIDs = order.pieceIDs || [];
  if (!pieceIDs.length) return [];
  const pieces = await Promise.all(pieceIDs.map((id) => PiecesModel.findById(id).catch(() => null)));
  const withDesign = await Promise.all(pieces.filter(Boolean).map(async (p) => ({
    piece: p,
    design: p.designID ? await DesignsModel.findById(p.designID).catch(() => null) : null,
  })));
  return withDesign
    .filter(({ design }) => design?.category === 'gemstone')
    .map(({ piece, design }) => ({
      pieceID: piece.pieceID,
      designID: design.designID,
      name: design.name,
      spec: piece.resolvedConfiguration || {},
      stonePrice: piece.stonePrice || null,
      status: piece.status,
    }));
}
