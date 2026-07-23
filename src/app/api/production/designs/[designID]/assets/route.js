import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { canManageDesign } from '@/lib/designPermissions';
import { uploadDesignAsset } from '@/utils/s3.util';

/**
 * POST /api/production/designs/[designID]/assets
 * multipart/form-data: { file, field? } where field ∈ cadFiles|renders|referenceImages
 * Uploads a CAD/STL/GLB/render to S3 and appends the URL to the design.
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

  const formData = await req.formData();
  const file = formData.get('file');
  const field = formData.get('field') || 'cadFiles';
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }
  if (!DesignsModel.ASSET_FIELDS.includes(field)) {
    return NextResponse.json(
      { error: `Invalid field. Allowed: ${DesignsModel.ASSET_FIELDS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const url = await uploadDesignAsset(file, designID);
    const updated = await DesignsModel.addAsset(designID, field, url);
    return NextResponse.json({ url, design: updated }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
