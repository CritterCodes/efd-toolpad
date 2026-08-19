import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { replaceCadStl } from '@/services/bench/pieceWorkOrderActions';

const CODE_STATUS = { FORBIDDEN: 403, BAD_REQUEST: 400, NOT_FOUND: 404 };

/**
 * POST /api/bench/work-orders/[workOrderID]/replace-stl  (JSON, not multipart)
 * Body: { url, key, originalName?, reason? }
 *
 * Swaps the STL on a CAD work order that already has one — a refinement (lighter model, thickness
 * tweak), NOT a QC rejection. Unlike attach-stl this does not move the work order to QC or notify
 * reviewers; the prior file is preserved on files.stlHistory and volume is re-measured server-side.
 * The browser PUTs the file straight to MinIO first (see /api/uploads/presign).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID } = await params;
  try {
    const { url, key, originalName, reason } = await req.json().catch(() => ({}));
    const wo = await replaceCadStl({ session, workOrderID, url, key, originalName, reason });
    return NextResponse.json(wo, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error('Error in replace-stl:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
