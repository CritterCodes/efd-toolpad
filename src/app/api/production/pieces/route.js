import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';
import { createPieceFromDesign, createDirectPiece } from '@/services/production/pieceRouting';

/** GET /api/production/pieces — list (optional ?designID= / ?dropId= / ?status=) */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter = {};
  const designID = searchParams.get('designID');
  const dropId = searchParams.get('dropId');
  const status = searchParams.get('status');
  if (designID) filter.designID = designID;
  if (dropId) filter.dropId = dropId;
  if (status) filter.status = status;
  const pieces = await PiecesModel.list(filter);
  return NextResponse.json(pieces, { status: 200 });
};

/**
 * POST /api/production/pieces — create a piece + spawn its routed work orders.
 * With `designID` → production path (routing from the Design). Without `designID` →
 * a direct handmade / premade-with-CAD piece, COGS-only, no estimate (Pipeline M1-T4).
 * Body: { designID?, metalType?, karat?, dropID?, sku?, routing?, actualMaterials?, customerID?, billing? }
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const createdBy = session.user.userID || session.user.email || '';

  try {
    const piece = body?.designID
      ? await createPieceFromDesign(body.designID, { ...body, createdBy })
      : await createDirectPiece({ ...body, createdBy });
    return NextResponse.json(piece, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
