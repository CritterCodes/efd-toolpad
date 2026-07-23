import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canCreateDrop, dropListFilter } from '@/lib/dropPermissions';

/** GET /api/production/drops — list drops (optional ?status=).
 *  Staff see everything; artisans see drops they OWN or COLLABORATE on. */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!isStaff(session) && session.user.role !== 'artisan') {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const drops = await DropsModel.list({ ...(status ? { status } : {}), ...dropListFilter(session) });
  return NextResponse.json(drops, { status: 200 });
};

/** POST /api/production/drops — create a drop. Artisans open THEIR OWN drop (ownership forced to
 *  themselves, status draft — releasing is EFD's); staff create anything. */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });
  if (!canCreateDrop(session)) {
    return NextResponse.json({ error: 'Access denied — drops can be created by design-authoring artisans and staff.' }, { status: 403 });
  }

  const drop = await DropsModel.create({
    ...body,
    ...(isStaff(session) ? {} : {
      ownerType: 'artisan',
      ownerId: session.user.userID || session.user.email,
      status: 'draft',
      releaseAt: null,
      releasedAt: null,
    }),
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(drop, { status: 201 });
};
