import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireRole } from '@/lib/apiAuth';
import { uploadEntityImage } from '@/lib/entityImages';

/**
 * POST /api/products/[id]/images — upload a product image (U-4; the products-catalog headline gap, U-6).
 * Products are keyed by ObjectId `_id` (consistent with the other product `[id]` routes).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 }); }

  const r = await uploadEntityImage({
    collection: 'products',
    filter: { _id: new ObjectId(id) },
    keyPrefix: `admin/products/${id}/images`,
    form,
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  });
  return NextResponse.json(r.error ? { error: r.error } : r.image, { status: r.status });
};
