import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import {
  EditionCapacityError,
  beginPieceProduction,
  beginManualPieceProduction,
} from '@/services/production/editionCapacity';
import { repriceGemAtClaim, gemCutTarget, spawnGemCuttingWO } from '@/services/production/gemClaim';

/**
 * POST /api/production/pieces/[pieceID]/start
 *
 * Atomically transitions a planned Piece into production: converts the Design's
 * committed slot to allocated (MTO path) or checks the cap directly (manual path),
 * assigns the next Design-wide edition number, and updates the Piece status to
 * casting_ordered — all in one MongoDB transaction. Idempotent: returns 409 if the
 * piece is not in the planned state.
 *
 * Path disambiguation:
 *   - piece.orderId set   → MTO checkout already reserved a committed slot;
 *                           use beginPieceProduction (converts committed → allocated).
 *   - piece.orderId null  → manual or custom piece; no committed slot exists;
 *                           use beginManualPieceProduction (cap check + allocate).
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const database = await db.connect();
  const client = db.client;

  const piece = await database
    .collection(Constants.PIECES_COLLECTION)
    .findOne({ pieceID }, { projection: { _id: 0 } });
  if (!piece) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });
  if (piece.status !== 'planned') {
    return NextResponse.json(
      { error: `Piece is already ${piece.status}; production start requires status planned.` },
      { status: 409 },
    );
  }

  try {
    const started = piece.orderId
      ? await beginPieceProduction({ client, database, pieceID })
      : await beginManualPieceProduction({ client, database, pieceID });

    // A directly-sold GEM piece enters production as a cut job, not a casting: spawn the
    // gem_cutting WO for the cutter and re-resolve the price at the ordered carat (drift is
    // informational — billing true-up at final carat is a deferred follow-up). Best-effort
    // AFTER the allocation transaction committed: a WO hiccup must not roll back the start.
    const design = await database
      .collection(Constants.DESIGNS_COLLECTION)
      .findOne({ designID: piece.designID }, { projection: { category: 1, variants: 1, primaryArtisanId: 1 } });
    if (design?.category === 'gemstone') {
      try {
        const variant = (design.variants || []).find((v) => v?.variantId === piece.variantId);
        const gemstone = variant?.gemstone || {};
        const rc = piece.resolvedConfiguration || {};
        const target = gemCutTarget({ gemstone, resolvedConfiguration: rc });
        const wo = await spawnGemCuttingWO({
          pieceID,
          gemDesignId: piece.designID,
          gemVariantId: piece.variantId,
          target,
          cutterUserID: design.primaryArtisanId || null,
        });
        const reprice = rc.color && rc.carat
          ? repriceGemAtClaim({ gemstone, colorLabel: rc.color, carat: rc.carat })
          : null;
        if (reprice && !reprice.priceable) {
          console.warn(`⚠️ gem piece ${pieceID}: claim-time reprice not priceable — ${reprice.reason}`);
        }
        return NextResponse.json({ ...started, gemCuttingWO: wo.workOrderID, ...(reprice?.priceable ? { claimReprice: { estCost: reprice.estCost, carat: rc.carat } } : {}) }, { status: 200 });
      } catch (gemErr) {
        console.error(`❌ gem piece ${pieceID}: production started but the gem_cutting WO failed to spawn:`, gemErr);
        return NextResponse.json({ ...started, gemCuttingWO: null, gemCuttingError: 'Work order failed to spawn — create it manually.' }, { status: 200 });
      }
    }

    return NextResponse.json(started, { status: 200 });
  } catch (err) {
    if (err instanceof EditionCapacityError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
};
