import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { uploadEntityImage } from '@/lib/entityImages';

/** POST /api/production/collections/[collectionID]/images — upload a cover/gallery image (U-4). */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { collectionID } = await params;
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 }); }

  const r = await uploadEntityImage({
    collection: 'collections',
    filter: { collectionId: collectionID },
    keyPrefix: `admin/production/collections/${collectionID}/images`,
    form,
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  });
  return NextResponse.json(r.error ? { error: r.error } : r.image, { status: r.status });
};
