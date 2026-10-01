import { isStaff, canManageDesign } from '@/lib/designPermissions';

/**
 * Who may open a casting batch or a shipping leg for pieces.
 *
 * Both POSTs checked only that the caller was signed in, so any account — a customer, a store — could open a
 * casting batch (billed to them, at cost) or a shipment on anybody's pieces (goal step 4, 2026-10-01). Staff
 * keep acting on anyone's behalf; everyone else may only act on pieces of designs they manage, and only on
 * their own casting batches.
 *
 * The loaders are injected so the rule is testable without a database. Each returns `{ status, error }` to
 * refuse, or null to allow.
 */
const refuse = (status, error) => ({ status, error });

/** Every piece exists and belongs to `designID`. */
async function piecesOfDesign(pieceIDs, designID, loadPiece) {
  if (!Array.isArray(pieceIDs) || pieceIDs.length === 0) return refuse(400, 'pieceIDs[] is required');
  for (const id of pieceIDs) {
    const piece = await loadPiece(id);
    if (!piece) return refuse(400, `piece ${id} not found`);
    if (piece.designID !== designID) return refuse(400, `piece ${id} is not a piece of design ${designID}`);
  }
  return null;
}

/** POST /api/production/casting — body { designID, pieceIDs[] }. */
export async function castingRefusal(session, { designID, pieceIDs } = {}, { loadDesign, loadPiece }) {
  if (isStaff(session)) return null;
  if (!designID) return refuse(400, 'designID is required');
  const design = await loadDesign(designID);
  if (!design) return refuse(404, 'design not found');
  if (!canManageDesign(session, design)) return refuse(403, 'Access denied — not your design.');
  return piecesOfDesign(pieceIDs, designID, loadPiece);
}

/** POST /api/production/shipments — body { pieceIDs[], castingBatchId? }. */
export async function shipmentRefusal(session, { pieceIDs, castingBatchId } = {}, { loadDesign, loadPiece, loadBatch }) {
  if (isStaff(session)) return null;
  if (castingBatchId) {
    const batch = await loadBatch(castingBatchId);
    if (!batch) return refuse(404, 'casting batch not found');
    if (batch.ownerId !== session?.user?.userID) return refuse(403, 'Access denied — not your casting batch.');
  }
  if (!Array.isArray(pieceIDs) || pieceIDs.length === 0) return refuse(400, 'pieceIDs[] is required');
  const designs = new Map();
  for (const id of pieceIDs) {
    const piece = await loadPiece(id);
    if (!piece) return refuse(400, `piece ${id} not found`);
    if (!designs.has(piece.designID)) designs.set(piece.designID, await loadDesign(piece.designID));
    const design = designs.get(piece.designID);
    if (!design || !canManageDesign(session, design)) return refuse(403, `Access denied — piece ${id} is not yours.`);
  }
  return null;
}
