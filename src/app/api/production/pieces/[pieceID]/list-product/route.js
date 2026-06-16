import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import PiecesModel from '@/app/api/pieces/model';
import DesignsModel from '@/app/api/designs/model';
import { buildProductFromPiece } from '@/services/products/productContract';

/**
 * POST /api/production/pieces/[pieceID]/list-product
 * Creates a contract-shaped draft product from the piece (pricing.costBasis = piece
 * COGS, suggested retail from COGS), links piece↔product, and marks the piece available.
 * Media (images/viewer) + publish happen via the product editor (UI phase) + existing
 * /api/products publish flow.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) return NextResponse.json({ error: 'Piece not found.' }, { status: 404 });
  if (piece.productID) {
    return NextResponse.json({ error: `Piece is already listed as product ${piece.productID}.` }, { status: 409 });
  }

  const design = piece.designID ? await DesignsModel.findById(piece.designID) : null;
  const body = await req.json().catch(() => ({}));

  const productDoc = buildProductFromPiece({
    piece,
    design,
    opts: { ...body, createdBy: session.user.userID || session.user.email || '' },
  });

  const now = new Date();
  const dbInstance = await db.connect();
  await dbInstance.collection('products').insertOne({ ...productDoc, createdAt: now, updatedAt: now });

  const updatedPiece = await PiecesModel.updateById(pieceID, {
    productID: productDoc.productId,
    status: 'available',
  });

  return NextResponse.json({ product: productDoc, piece: updatedPiece }, { status: 201 });
};
