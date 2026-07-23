import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canViewDrop, canManageDrop, validateArtisanDropPatch } from '@/lib/dropPermissions';

/** GET /api/production/drops/[dropID] — staff, the owning artisan, or a collaborator. */
export const GET = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const drop = await DropsModel.findById(dropID);
  if (!drop) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  if (!canViewDrop(session, drop)) {
    return NextResponse.json({ error: 'Access denied — not your drop.' }, { status: 403 });
  }
  return NextResponse.json(drop, { status: 200 });
};

/** PUT /api/production/drops/[dropID] — staff, or the OWNING artisan (who controls curation but
 *  never release timing/status/ownership — releasing is EFD's). */
export const PUT = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { dropID } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await DropsModel.findById(dropID);
  if (!existing) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  if (!canManageDrop(session, existing)) {
    return NextResponse.json({ error: 'Access denied — not your drop.' }, { status: 403 });
  }
  if (!isStaff(session)) {
    const check = validateArtisanDropPatch(body, existing);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });
  }
  const updated = await DropsModel.updateById(dropID, body);
  if (!updated) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
