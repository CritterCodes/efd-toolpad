import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { uploadCadStl } from '@/services/bench/pieceWorkOrderActions';

const CODE_STATUS = { FORBIDDEN: 403, BAD_REQUEST: 400, NOT_FOUND: 404 };

/**
 * POST /api/bench/work-orders/[workOrderID]/upload-stl (multipart)
 * The assigned CAD designer uploads the STL (metal-only) → moves the WO to QC.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { workOrderID } = await params;
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'An STL file is required.' }, { status: 400 });
    }
    const wo = await uploadCadStl({ session, workOrderID, file });
    return NextResponse.json(wo, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error('Error in upload-stl:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
