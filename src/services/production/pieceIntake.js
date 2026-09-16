/**
 * Premade intake — recording a physical piece that ALREADY EXISTS.
 *
 * Every other way to make a Piece in this system assumes the piece is about to be produced here:
 * `createPieceFromDesign` and `createDirectPiece` both spawn routed work orders, and there is no
 * way to opt out (an empty `routing` falls through to the design's, then to DEFAULT_ROUTING).
 * That is right for "make one" and wrong for the case this module exists for — the ring already
 * in the case, the stone a cutter consigned, the handmade piece finished last year. The work is
 * done, and most of it was not done here. Spawning work orders for it would invent labor that
 * never happened and credit it to somebody in the earnings ledger.
 *
 * So intake creates the piece `available`, with no work orders, and records what it actually cost
 * as a single material line — which is how `computePieceCosts` derives `totalCOGS`, the number the
 * rest of the system reads as a piece's cost. No new cost field, no second source of truth.
 *
 * The edition slot is still allocated properly, through `allocateEditionNumber`: a physical piece
 * that exists consumes capacity whether or not this shop made it. A one-of-one that already has
 * its piece has nothing left to give, and intake refuses rather than quietly minting a second.
 */
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computePieceCosts } from '@/services/production/pieceCost';
import { validatePiece, PIECE_STATUS } from '@/app/api/pieces/model';
import { allocateEditionNumber, withEditionTransaction } from '@/services/production/editionCapacity';

/** How a recorded intake cost appears in the piece's materials. */
export const PREMADE_COST_LABEL = 'Recorded cost (premade)';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v) => (v == null || v === '' ? null : String(v).trim() || null);

/**
 * The cost of a premade piece as a material line, so `totalCOGS` comes out of the same pure
 * function as every other piece's. A piece taken in at no recorded cost (a consignment where the
 * payout is settled on sale) gets no line at all rather than a zero that reads as "free to make".
 */
export function premadeMaterials(cost) {
  const value = num(cost);
  if (!(value > 0)) return [];
  return [{ label: PREMADE_COST_LABEL, unitCost: value, qty: 1, source: 'premade-intake' }];
}

/** The variant this piece is an instance of; a design with none gets a stable synthetic id. */
export function resolveVariant(design, variantId = null) {
  const variants = design?.variants || [];
  return variants.find((v) => v.variantId === variantId)
    || variants.find((v) => v.variantId === design?.defaultVariantId && v.active !== false)
    || variants.find((v) => v.active)
    || variants[0]
    || null;
}

/**
 * The piece document for an existing physical thing. Pure — the caller inserts it.
 *
 * @param {{design: object, editionNumber: number, data?: object, actor?: string|null}} args
 */
export function buildPremadePiece({ design, editionNumber, data = {}, actor = null }) {
  const variant = resolveVariant(design, data.variantId);
  const variantId = variant?.variantId || `${design.designID}::default`;
  const actualMaterials = Array.isArray(data.actualMaterials) && data.actualMaterials.length
    ? data.actualMaterials
    : premadeMaterials(data.cost);
  const now = new Date();

  const piece = {
    pieceID: randomUUID(),
    designID: design.designID,
    variantId,
    resolvedConfiguration: {
      ...(variant?.options || {}),
      ...(str(data.metalType) ? { metalType: str(data.metalType) } : {}),
      ...(str(data.karat) ? { karat: str(data.karat) } : {}),
    },
    editionNumber,
    gemstoneId: design.gemstoneId ?? null,
    dropId: design.dropId ?? design.dropID ?? null,
    sku: str(data.sku),
    serialNumber: str(data.serialNumber),
    metalType: str(data.metalType),
    karat: str(data.karat),
    finish: str(data.finish),
    ringSize: str(data.ringSize),
    dimensions: data.dimensions ?? null,
    weight: num(data.weight),
    stones: Array.isArray(data.stones) ? data.stones : [],
    actualMaterials,
    // The defining fact: no work orders. Nobody is owed labor for work done elsewhere.
    workOrderIDs: [],
    // It exists and it is sellable now — that is the whole point of recording it.
    status: PIECE_STATUS.AVAILABLE,
    productID: null,
    customerID: null,
    customOrderID: null,
    billing: null,
    // What the shop charges for this one-off. The daily repricer authors VARIANT prices, so a
    // price set here is the one that sticks.
    pricing: {
      retailPrice: num(data.retailPrice ?? data.price),
      compareAtPrice: num(data.compareAtPrice),
    },
    // How this piece came to exist, so a premade one is never mistaken for one we produced.
    provenance: {
      kind: data.provenance || 'premade',
      madeBy: str(data.madeBy) || design.primaryArtisanId || null,
      acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : now,
      note: str(data.note),
    },
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    ...computePieceCosts({ actualMaterials, laborLogs: [] }),
  };

  const validation = validatePiece(piece);
  if (!validation.valid) throw new TypeError(validation.errors.join('; '));
  return piece;
}

/**
 * Record an existing physical piece against a design, consuming one edition slot.
 *
 * The allocation and the insert commit together: a number handed out for a piece that never
 * landed would be a gap in the edition nobody could explain.
 */
export async function intakePremadePiece({ client, database, design, data = {}, actor = null }) {
  return withEditionTransaction(client, async (session) => {
    const editionNumber = await allocateEditionNumber({ database, designID: design.designID, session });
    const piece = buildPremadePiece({ design, editionNumber, data, actor });
    await database.collection(Constants.PIECES_COLLECTION).insertOne(piece, { session });
    return piece;
  });
}
