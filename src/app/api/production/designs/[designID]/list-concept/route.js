import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { canManageDesign } from '@/lib/designPermissions';
import DesignsModel from '@/app/api/designs/model';
import { designReleaseReadiness } from '@/services/production/dropRelease';

/**
 * List / unlist a Design.
 *
 * Listing used to mean "create a product document from this design". There is no products
 * collection any more — the storefront reads designs and pieces — so listing is exactly one
 * thing: setting `design.listing`, which is the flag the shop's visibility test reads.
 *
 * `handle` is the design's public URL segment. It is set once and then left alone, so a listing
 * keeps its address for life (and pre-migration URLs, which were the old product id, still
 * resolve because that is what the handle is seeded from).
 *
 * Route name kept for the existing UI; the response still carries `design` + readiness so the
 * design page can show what is still missing.
 */

async function loadForWrite(designID) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return { errorResponse };
  const design = await DesignsModel.findById(designID);
  if (!design) return { errorResponse: NextResponse.json({ error: 'Design not found.' }, { status: 404 }) };
  if (!canManageDesign(session, design)) {
    return { errorResponse: NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 }) };
  }
  return { session, design };
}

/** POST — list this design (make it a storefront listing). Idempotent. */
export const POST = async (req, { params }) => {
  const { designID } = await params;
  const { session, design, errorResponse } = await loadForWrite(designID);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const readiness = designReleaseReadiness(design);

  // Listing something unsellable is how a listing ends up live and empty, which is the failure
  // this whole rework exists to stop. Refuse, and say what is missing.
  if (!readiness.eligible && body.force !== true) {
    return NextResponse.json(
      { error: 'This design is not ready to list.', reasons: readiness.reasons, design },
      { status: 409 },
    );
  }

  const handle = design.listing?.handle || design.primaryProductId || design.designID;
  const updated = await DesignsModel.updateById(designID, {
    listing: {
      published: true,
      visible: true,
      featured: design.listing?.featured === true,
      handle,
      publishedAt: design.listing?.publishedAt || new Date(),
      listedBy: session.user.userID || session.user.email || null,
    },
  });

  return NextResponse.json({ design: updated, handle, listed: true }, { status: 200 });
};

/** DELETE — unlist (hide from the shop). The design and its pieces are untouched. */
export const DELETE = async (req, { params }) => {
  const { designID } = await params;
  const { design, errorResponse } = await loadForWrite(designID);
  if (errorResponse) return errorResponse;

  const updated = await DesignsModel.updateById(designID, {
    listing: { ...(design.listing || {}), published: false, visible: false },
  });
  return NextResponse.json({ design: updated, listed: false }, { status: 200 });
};
