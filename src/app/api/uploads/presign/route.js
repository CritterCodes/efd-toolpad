import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import DesignsModel from '@/app/api/designs/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { canManageDesign } from '@/lib/designPermissions';
import { presignPut, buildUploadKey } from '@/lib/presign';

/**
 * POST /api/uploads/presign — hand the browser a short-lived signed PUT so a large file goes STRAIGHT
 * to MinIO, never through this function.
 *
 * A serverless request body is capped at ~4.5 MB. The STL on a design or CAD work order is the
 * MANUFACTURING file sent to Carrera to cast from (a real one is 91 MB), so it cannot be shrunk to fit
 * a transport limit — the transport has to change.
 *
 * THE SERVER OWNS THE KEY. A client-supplied key on a signed URL would let any authenticated artisan
 * write anywhere in the bucket, including over another artisan's objects. The client sends a `scope`
 * (what it's uploading for) plus a filename; the key is derived here after an ownership check.
 */

/** Generous ceiling — an abuse guard, not a workflow limit. Manufacturing STLs sit far below this. */
const MAX_PRESIGNED_BYTES = 500 * 1024 * 1024;

/** Extensions we'll sign. Keeps a signed URL from becoming a general-purpose file drop. */
const ALLOWED_EXT = ['stl', 'glb', 'gltf', '3dm', 'step', 'stp', 'obj', 'zip', 'png', 'jpg', 'jpeg', 'webp'];

const extOf = (name) => String(name || '').split('.').pop()?.toLowerCase() || '';

export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { scope, id, filename, contentType, size } = await req.json().catch(() => ({}));
  if (!filename) return NextResponse.json({ error: 'filename is required.' }, { status: 400 });

  const ext = extOf(filename);
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type ".${ext}". Allowed: ${ALLOWED_EXT.join(', ')}` },
      { status: 400 },
    );
  }
  if (Number(size) > MAX_PRESIGNED_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 500 MB maximum.' }, { status: 413 });
  }

  // Per-scope ownership check, then a server-chosen key folder.
  let folder;
  if (scope === 'design') {
    const design = await DesignsModel.findById(id);
    if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
    if (!canManageDesign(session, design)) {
      return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
    }
    folder = `designs/${design.designID}`;
  } else if (scope === 'work-order') {
    const wo = await WorkOrdersModel.findByID(id);
    if (!wo) return NextResponse.json({ error: 'Work order not found.' }, { status: 404 });
    // The assigned worker or staff — mirrors uploadCadStl's own rule.
    if (!isStaff(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
      return NextResponse.json({ error: 'Only the assigned designer can upload for this work order.' }, { status: 403 });
    }
    folder = `production/pieces/${wo.sourceID}/${ext === 'stl' ? 'stl' : 'cad'}`;
  } else {
    return NextResponse.json({ error: 'scope must be "design" or "work-order".' }, { status: 400 });
  }

  try {
    const key = buildUploadKey({ folder, filename });
    // Sign the Content-Type only when the client gave one — it must then send exactly that header or
    // the signature won't match.
    const signed = presignPut(key, { contentType: contentType || null });
    return NextResponse.json(signed, { status: 200 });
  } catch (error) {
    console.error('[uploads] presign failed:', error?.message || error);
    return NextResponse.json({ error: 'Could not prepare the upload.' }, { status: 500 });
  }
};
