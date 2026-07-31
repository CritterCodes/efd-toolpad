import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { attachCadStl } from '@/services/bench/pieceWorkOrderActions';

const CODE_STATUS = { FORBIDDEN: 403, BAD_REQUEST: 400, NOT_FOUND: 404 };

/**
 * POST /api/bench/work-orders/[workOrderID]/attach-stl  (JSON, not multipart)
 * Body: { url, key, originalName? }
 *
 * The direct-upload counterpart to `upload-stl`. The browser has already PUT the STL straight to MinIO
 * via a presigned URL (see /api/uploads/presign), so this route only records the reference and moves
 * the work order to QC — the same effects as `upload-stl` minus the bytes.
 *
 * This exists because a CAD STL is the MANUFACTURING file Carrera casts from (a real one is 91 MB) and
 * a serverless request body caps at ~4.5 MB, so the file physically cannot come through `upload-stl`.
 * That route is kept for small files and as a fallback.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID } = await params;
  try {
    const { url, key, originalName } = await req.json().catch(() => ({}));
    // Volume is measured server-side from the stored object — see attachCadStl.
    const wo = await attachCadStl({ session, workOrderID, url, key, originalName });
    return NextResponse.json(wo, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error('Error in attach-stl:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
