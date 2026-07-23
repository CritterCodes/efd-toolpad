import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel, { validateDesign } from '@/app/api/designs/model';
import { isStaff, canManageDesign } from '@/lib/designPermissions';

/** GET /api/production/designs/[designID] — staff, or the artisan who owns it. */
export const GET = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }
  return NextResponse.json(design, { status: 200 });
};

/** PUT /api/production/designs/[designID] — staff, or the owning artisan (who cannot
 *  reassign ownership). */
export const PUT = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await DesignsModel.findById(designID);
  if (!existing) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, existing)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }
  // An artisan cannot hand their design to someone else (or orphan it) — credit is the owner's call.
  if (!isStaff(session) && body.primaryArtisanId !== undefined && body.primaryArtisanId !== existing.primaryArtisanId) {
    return NextResponse.json({ error: 'Only staff can reassign a design’s artisan credit.' }, { status: 403 });
  }
  // Gemstone designs get merged-doc validation on update (the UI promises priceable variants;
  // hold the API to it). Jewelry keeps the historical raw-$set behavior for partial updates.
  const merged = { ...existing, ...body };
  if (merged.category === 'gemstone' && (body.variants || body.category || body.edition || body.status)) {
    const validation = validateDesign(merged);
    if (!validation.valid) return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }
  const updated = await DesignsModel.updateById(designID, body);
  if (!updated) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};

/** DELETE /api/production/designs/[designID] — staff or the owning artisan; drafts only:
 *  refused once any piece has been produced or committed (the edition counters record that). */
export const DELETE = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }
  if ((design.edition?.allocated || 0) > 0 || (design.edition?.committed || 0) > 0) {
    return NextResponse.json({ error: 'Cannot delete — this design has produced or committed pieces.' }, { status: 409 });
  }
  const deleted = await DesignsModel.deleteById(designID);
  return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
};
