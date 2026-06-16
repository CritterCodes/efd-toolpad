import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';

/** GET /api/production/drops — list drops (optional ?status=) */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const drops = await DropsModel.list(status ? { status } : {});
  return NextResponse.json(drops, { status: 200 });
};

/** POST /api/production/drops — create a drop */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });

  const drop = await DropsModel.create({
    ...body,
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(drop, { status: 201 });
};
