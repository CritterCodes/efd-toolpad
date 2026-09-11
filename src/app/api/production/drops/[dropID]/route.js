import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';
import { isStaff, canViewDrop, canManageDrop, validateArtisanDropPatch } from '@/lib/dropPermissions';
import { releaseDrop, parseReleaseAt } from '@/services/production/dropRelease';

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

  // `releaseAt` arrives from a datetime-local input as a bare local-time STRING
  // ("2026-09-11T15:10"). Stored raw it sorts and compares as text, so the release cron
  // could never tell whether a drop was due. Normalize to a real Date on the way in.
  if (body.releaseAt !== undefined) {
    body.releaseAt = body.releaseAt ? parseReleaseAt(body.releaseAt) : null;
  }

  // Setting status to `released` from the editor IS a release — run the engine (publish the
  // drop's listings) instead of only writing the word "released" on the drop, which is what
  // this route used to do while the shop stayed empty.
  if (body.status === 'released' && existing.status !== 'released') {
    const { status, ...rest } = body;
    if (Object.keys(rest).length) await DropsModel.updateById(dropID, rest);
    const result = await releaseDrop(dropID, {
      releasedBy: session.user.userID || session.user.email || null,
    });
    if (!result.ok) return NextResponse.json(result, { status: 409 });
    const drop = await DropsModel.findById(dropID);
    return NextResponse.json({ ...drop, release: result }, { status: 200 });
  }

  const updated = await DropsModel.updateById(dropID, body);
  if (!updated) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
