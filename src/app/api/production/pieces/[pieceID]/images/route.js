import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { uploadEntityImage } from '@/lib/entityImages';

/** POST /api/production/pieces/[pieceID]/images — upload an image (U-4; MinIO via lib/entityImages). */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Expected multipart/form-data with a file.' }, { status: 400 }); }

  const r = await uploadEntityImage({
    collection: 'pieces',
    filter: { pieceID },
    keyPrefix: `admin/production/pieces/${pieceID}/images`,
    form,
    uploadedBy: session.user.name || session.user.email || session.user.userID || 'admin',
  });
  return NextResponse.json(r.error ? { error: r.error } : r.image, { status: r.status });
};
