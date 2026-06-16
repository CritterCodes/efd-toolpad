import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { createShareLink, setShareEnabled } from '@/services/customs/customViewer';

/** POST /api/custom-orders/[customID]/share — mint a public share link (needs a model first) */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await createShareLink(customID, body.shareTitle);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error.code === 'NO_MODEL' ? 400 : 404;
    return NextResponse.json({ error: error.message }, { status });
  }
};

/** PUT /api/custom-orders/[customID]/share — revoke / re-enable ({ enabled: boolean }) */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const order = await setShareEnabled(customID, body.enabled);
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
