import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';

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
  const updated = await PiecesModel.updateById(pieceID, body);
  if (!updated) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
