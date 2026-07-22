import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';

/** GET /api/production/designs/[designID] */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  return NextResponse.json(design, { status: 200 });
};

/** PUT /api/production/designs/[designID] */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = await DesignsModel.updateById(designID, body);
  if (!updated) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};

/** DELETE /api/production/designs/[designID] — drafts only: refused once any piece
 *  has been produced or committed (the edition counters are the record of that). */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if ((design.edition?.allocated || 0) > 0 || (design.edition?.committed || 0) > 0) {
    return NextResponse.json({ error: 'Cannot delete — this design has produced or committed pieces.' }, { status: 409 });
  }
  const deleted = await DesignsModel.deleteById(designID);
  return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
};
