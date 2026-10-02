import { NextResponse } from 'next/server';
import { requireCustomsCadWrite } from '@/lib/customsPermissions';
import { setDesignModel } from '@/services/customs/customViewer';

/**
 * PUT /api/custom-orders/[customID]/design-model
 * Body: designModel { glbUrl, meshMap[], environment?, orientation?, background? }
 * (meshMap built via the storefront's POST /api/glb/inspect).
 */
export const PUT = async (req, { params }) => {
  const { customID } = await params;
  // Staff, or THIS order's assigned CAD designer — the GLB and its viewer config are their output.
  const { errorResponse } = await requireCustomsCadWrite(customID);
  if (errorResponse) return errorResponse;

  const designModel = await req.json().catch(() => ({}));
  try {
    const order = await setDesignModel(customID, designModel);
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    const status = error.code === 'INVALID_DESIGN_MODEL' ? 400 : 404;
    return NextResponse.json({ error: error.message }, { status });
  }
};
