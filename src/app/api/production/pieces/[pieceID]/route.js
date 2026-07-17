import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import PiecesModel from '@/app/api/pieces/model';
import { propagateGemstoneStatus } from '@/services/production/gemstoneLifecycle';

/** GET /api/production/pieces/[pieceID] */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });
  return NextResponse.json(piece, { status: 200 });
};

/** PUT /api/production/pieces/[pieceID] — e.g. status changes */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const body = await req.json().catch(() => ({}));

  // Edition allocation must happen atomically through the production-start route.
  // Reject any direct status update that would set casting_ordered, which is the
  // status assigned by that guarded transition.
  if (body.status === 'casting_ordered') {
    return NextResponse.json(
      { error: 'Use POST /api/production/pieces/:id/start to begin production; direct status updates to casting_ordered are not permitted.' },
      { status: 409 },
    );
  }

  const updated = await PiecesModel.updateById(pieceID, body);
  if (!updated) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });

  if (updated.gemstoneId && (body.status === 'reserved' || body.status === 'sold')) {
    const database = await db.connect();
    await propagateGemstoneStatus(updated, database);
  }

  return NextResponse.json(updated, { status: 200 });
};
