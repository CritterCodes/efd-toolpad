import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireRole } from '@/lib/apiAuth';
import { deleteEntityImage } from '@/lib/entityImages';

/** DELETE /api/products/[id]/images/[imageID] — remove a product image (U-4). */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { id, imageID } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
  const r = await deleteEntityImage({ collection: 'products', filter: { _id: new ObjectId(id) }, imageId: imageID });
  return NextResponse.json(r.error ? { error: r.error } : { ok: true }, { status: r.status });
};
