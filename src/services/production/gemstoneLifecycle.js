/**
 * Gemstone lifecycle: propagate a jewelry piece's reserved/sold status to the
 * linked gemstone's own production piece (Pipeline M1-T2, §2 spec).
 *
 * When a parent jewelry piece transitions to `reserved` (sold) or `sold`
 * (delivered), its gemstone's own piece — identified by productID matching
 * the gemstoneId — must follow the same transition. The gemstone piece is
 * optional: if the gemstone product has no backing piece, the call is a no-op.
 */
import Constants from '@/lib/constants';

const PROPAGATED_STATUSES = new Set(['reserved', 'sold']);

/**
 * Propagate the parent piece's status to the linked gemstone's own piece.
 * Call this after any piece status update that might be `reserved` or `sold`.
 *
 * @param {object} piece - The updated parent piece (must have gemstoneId, pieceID, status)
 * @param {import('mongodb').Db} database - Connected MongoDB database instance
 * @returns {Promise<object|null>} The updated gemstone piece, or null if none exists
 */
export async function propagateGemstoneStatus(piece, database) {
  if (!piece?.gemstoneId || !PROPAGATED_STATUSES.has(piece.status)) return null;

  const pieces = database.collection(Constants.PIECES_COLLECTION);
  const result = await pieces.findOneAndUpdate(
    { productID: piece.gemstoneId },
    { $set: { status: piece.status, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { _id: 0 } },
  );
  return result ?? null;
}
