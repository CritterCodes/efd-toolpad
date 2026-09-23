import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { addCustomCutStone, stoneComponentsFor } from '@/services/customs/customGemComponent';

/**
 * Commissioned stones on a custom order (services/customs/customGemComponent.js).
 *
 *   GET  → the order's stone components (spec, price, status)
 *   POST → add one: its own gemstone Design + Piece + a gem_cutting work order on THE STONE
 *
 * Body: { species, cut[], cutStyle[], colorLabel, sizeMode: 'carat'|'dimensions', carat, targetMm,
 *         tolerance, clarity, treatment, naturalSynthetic, cutLaborCost, yield, notes, cutterUserID }
 */
export const GET = async (_req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  try {
    return NextResponse.json({ stones: await stoneComponentsFor(customID) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  const { cutterUserID = null, ...stone } = body || {};
  try {
    const result = await addCustomCutStone({
      customID,
      stone,
      cutterUserID,
      createdBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(
      { designID: result.design.designID, pieceID: result.piece.pieceID, workOrderID: result.workOrder?.workOrderID ?? null },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
