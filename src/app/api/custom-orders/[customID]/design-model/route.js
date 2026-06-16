import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { setDesignModel } from '@/services/customs/customViewer';

/**
 * PUT /api/custom-orders/[customID]/design-model
 * Body: designModel { glbUrl, meshMap[], environment?, orientation?, background? }
 * (meshMap built via the storefront's POST /api/glb/inspect).
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const designModel = await req.json().catch(() => ({}));
  try {
    const order = await setDesignModel(customID, designModel);
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    const status = error.code === 'INVALID_DESIGN_MODEL' ? 400 : 404;
    return NextResponse.json({ error: error.message }, { status });
  }
};
