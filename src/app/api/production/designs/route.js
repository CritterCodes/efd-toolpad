import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';

/** GET /api/production/designs — list designs (optional ?dropID=) */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const dropID = searchParams.get('dropID');
  const designs = dropID ? await DesignsModel.findByDrop(dropID) : await DesignsModel.list();
  return NextResponse.json(designs, { status: 200 });
};

/** POST /api/production/designs — create a design */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });

  const design = await DesignsModel.create({
    ...body,
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(design, { status: 201 });
};
