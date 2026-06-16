import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';

/**
 * POST /api/production/pieces/[pieceID]/materials
 * Body: { materialID?, description?, qty?, unitCost } — appends an actual material
 * (at cost) and re-rolls the piece's COGS.
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.unitCost == null) return NextResponse.json({ error: 'unitCost is required.' }, { status: 400 });

  const material = {
    materialID: body.materialID ?? null,
    description: body.description ?? '',
    qty: Number(body.qty) || 1,
    unitCost: Number(body.unitCost) || 0,
  };
  const updated = await PiecesModel.addMaterial(pieceID, material);
  return NextResponse.json(updated, { status: 201 });
};
