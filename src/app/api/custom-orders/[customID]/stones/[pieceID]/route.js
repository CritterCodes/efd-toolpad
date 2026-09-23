import { NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/apiAuth';
import PiecesModel from '@/app/api/pieces/model';
import DesignsModel from '@/app/api/designs/model';
import { setStonePrice } from '@/services/customs/customGemComponent';

/**
 * PATCH /api/custom-orders/[customID]/stones/[pieceID]  { price, note?, applyToQuote? }
 *
 * The cutter's own quote for a commissioned stone — the thing that did not exist anywhere before
 * (owner, 2026-09-23: "there's no quoting for him to say this is the price of the stone"). Recording
 * it also ports it into the ring's quote as the centre-stone cost, so the number the client is charged
 * is derived from the stone rather than retyped.
 *
 * Who may set it: an admin, or the cutter this stone belongs to — the design's primary artisan. That
 * is the whole point; a price the cutter cannot enter is a price an admin has to guess.
 */
export const PATCH = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { customID, pieceID } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    if (!isAdmin(session)) {
      const piece = await PiecesModel.findById(pieceID).catch(() => null);
      // 404 rather than 403 for a stone that is not theirs: a guessed pieceID must not confirm
      // that it exists, the same rule the rest of these routes follow.
      if (!piece || piece.customOrderID !== customID) return NextResponse.json({ error: 'Stone not found.' }, { status: 404 });
      const design = piece.designID ? await DesignsModel.findById(piece.designID).catch(() => null) : null;
      if (!design || design.primaryArtisanId !== session.user.userID) {
        return NextResponse.json({ error: 'Stone not found.' }, { status: 404 });
      }
    }

    const result = await setStonePrice({
      customID,
      pieceID,
      price: body?.price,
      quotedBy: session.user.userID || session.user.email || '',
      note: body?.note || '',
      applyToQuote: body?.applyToQuote !== false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
