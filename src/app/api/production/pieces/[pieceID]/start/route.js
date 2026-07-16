import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import {
  EditionCapacityError,
  beginPieceProduction,
  beginManualPieceProduction,
} from '@/services/production/editionCapacity';

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
    return NextResponse.json(started, { status: 200 });
  } catch (err) {
    if (err instanceof EditionCapacityError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
};
