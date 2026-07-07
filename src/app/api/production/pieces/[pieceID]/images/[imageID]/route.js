import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { deleteEntityImage } from '@/lib/entityImages';

/** DELETE /api/production/pieces/[pieceID]/images/[imageID] — remove an image (U-4). */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID, imageID } = await params;
  const r = await deleteEntityImage({ collection: 'pieces', filter: { pieceID }, imageId: imageID });
  return NextResponse.json(r.error ? { error: r.error } : { ok: true }, { status: r.status });
};
