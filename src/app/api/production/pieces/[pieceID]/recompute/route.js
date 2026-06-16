import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';

/**
 * POST /api/production/pieces/[pieceID]/recompute
 * Re-rolls COGS from actual materials + labor logged against the piece's work orders.
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const updated = await PiecesModel.recomputeCosts(pieceID);
  if (!updated) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
