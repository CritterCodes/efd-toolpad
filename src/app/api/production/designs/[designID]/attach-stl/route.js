import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { canManageDesign } from '@/lib/designPermissions';
import { stlVolumeCm3FromStorage } from '@/lib/stlVolumeStream';

/**
 * POST /api/production/designs/[designID]/attach-stl
 * Body: { url, key, glbUrl? }
 *
 * Records an STL the browser already PUT straight to MinIO (see /api/uploads/presign) and MEASURES ITS
 * VOLUME SERVER-SIDE.
 *
 * Volume must not come from the client (owner: "we cant rely on the client to enter the volume, it has
 * to be calculated"). It feeds `estimateMetalCost` → mounting cost → the customer's retail price, so a
 * browser-supplied figure would be both untrustworthy and unreliable — the parser can fail outright on
 * a 1.9M-triangle manufacturing model. The generic design PUT therefore also refuses `stlVolumeCm3`;
 * this route is the only way it gets set.
 *
 * `glbUrl` IS accepted from the client, deliberately: for gemstone designs the viewer GLB is generated
 * in the browser from the same solid, and it's a rendering asset with no bearing on price.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }

  const { url, key, glbUrl } = await req.json().catch(() => ({}));
  if (!url || !key) {
    return NextResponse.json({ error: 'The uploaded file reference is incomplete.' }, { status: 400 });
  }
  // The presign route builds keys as `designs/<designID>/...`; anything else means the caller is trying
  // to attach an object that isn't theirs.
  if (!String(key).startsWith(`designs/${designID}/`)) {
    return NextResponse.json({ error: 'That file does not belong to this design.' }, { status: 403 });
  }

  // Measure it ourselves. Best-effort: null (rendered as "not calculated yet") never blocks the upload.
  const stlVolumeCm3 = await stlVolumeCm3FromStorage(key);

  const fields = { stlUrl: url, stlVolumeCm3 };
  if (glbUrl) {
    fields.designModel = { ...(design.designModel || {}), glbUrl, generatedFromStl: true };
  }
  const updated = await DesignsModel.updateById(designID, fields);
  if (!updated) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  return NextResponse.json({ design: updated, stlVolumeCm3 }, { status: 200 });
};
