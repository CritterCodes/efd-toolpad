import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';

/** GET /api/production/drops/[dropID] */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const drop = await DropsModel.findById(dropID);
  if (!drop) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  return NextResponse.json(drop, { status: 200 });
};

/** PUT /api/production/drops/[dropID] */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = await DropsModel.updateById(dropID, body);
  if (!updated) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
