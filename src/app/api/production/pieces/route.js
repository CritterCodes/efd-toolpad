import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';
import { createPieceFromDesign } from '@/services/production/pieceRouting';

/** GET /api/production/pieces — list (optional ?designID= / ?status=) */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter = {};
  const designID = searchParams.get('designID');
  const status = searchParams.get('status');
  if (designID) filter.designID = designID;
  if (status) filter.status = status;
  const pieces = await PiecesModel.list(filter);
  return NextResponse.json(pieces, { status: 200 });
};

/**
 * POST /api/production/pieces — create a piece from a design (spawns routed work orders)
 * Body: { designID, metalType?, karat?, dropID?, sku?, actualMaterials?, customerID?, billing? }
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.designID) return NextResponse.json({ error: 'designID is required.' }, { status: 400 });

  try {
    const piece = await createPieceFromDesign(body.designID, {
      ...body,
      createdBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(piece, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
