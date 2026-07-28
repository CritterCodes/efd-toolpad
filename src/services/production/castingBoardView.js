import { buildOrderLines } from '@/services/production/castingVendorOrder';

/**
 * Casting-board projection — turns a batch + its design + its pieces into what a board card needs:
 * the design's name and the per-variant/metal lines ("2× 14K Yellow Gold, 1× Platinum"), so the card
 * shows WHAT to order rather than an opaque piece count. PURE.
 *
 * Reuses the already-tested `buildOrderLines`; no duplicate metal logic lives here. Every failure is
 * reported in `lineErrors` and NEVER thrown — one unresolvable batch must not blank the whole board.
 *
 * @param {object} batch                    a castingBatches doc
 * @param {object|null} design              the batch's design, or null if it no longer resolves
 * @param {Record<string,object>} pieceById  pieceID → piece (missing ids are tolerated + reported)
 */
export function enrichBatch(batch = {}, design = null, pieceById = {}) {
  const pieceIDs = batch.pieceIDs || [];
  if (!design) {
    return { ...batch, designName: batch.designID || null, lines: [], lineErrors: ['design not found'] };
  }
  const pieces = pieceIDs.map((id) => pieceById[id]).filter(Boolean);
  const missing = pieceIDs.length - pieces.length;

  let lines = [];
  let lineErrors = [];
  try {
    ({ lines, errors: lineErrors } = buildOrderLines(pieces, design));
  } catch (e) {
    lines = [];
    lineErrors = [e?.message || 'could not compute order lines'];
  }
  if (missing > 0) lineErrors = [...lineErrors, `${missing} piece(s) no longer exist`];

  return { ...batch, designName: design.name || batch.designID || null, lines, lineErrors };
}
