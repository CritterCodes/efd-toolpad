import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { canManageDesign } from '@/lib/designPermissions';
import { requestDesignCad, resolveDesignCadFee, DesignCadError } from '@/services/production/designCad';

/**
 * GET /api/production/designs/[designID]/cad-request — the quote preview: the CAD flat fee the
 * requester would accept (the assigned/creating designer's profile fee). Staff or the owner.
 */
export const GET = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const designer = searchParams.get('assignTo') || session.user.userID;
  const fee = await resolveDesignCadFee(designer);
  return NextResponse.json({ designID, cadFee: fee }, { status: 200 });
};

/**
 * POST /api/production/designs/[designID]/cad-request — spawn a Request-CAD work order.
 * Body: { solo?, assignToUserID?, sketchUrl?, acceptedFee?, notes? }. Quote accepted at creation.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  try {
    const result = await requestDesignCad({
      designID,
      createdBy: session.user.userID,
      solo: body.solo !== false,
      assignToUserID: body.assignToUserID ?? null,
      sketchUrl: body.sketchUrl ?? null,
      acceptedFee: body.acceptedFee ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof DesignCadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
};
