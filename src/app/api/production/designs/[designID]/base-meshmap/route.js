import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { mergeBaseMeshMap } from '@/services/production/customizableBindings';

/**
 * PUT /api/production/designs/[designID]/base-meshmap  (M3-T1 — base material tagging)
 * Persist the base material-tagging output from `<MaterialStudio>` (refrakt `Studio`) onto the
 * design's viewer config. Body: `{ meshMap, glbUrl? }` (the Studio config's meshMap).
 *
 * NON-DESTRUCTIVE (PM ruling #169, refrakt gotcha #170): the base re-tag owns base material fields,
 * but the per-slot `customizable` block + `volumeCm3` (authored by `<ConfiguratorSetup>`, M3-T2) are
 * merge-PRESERVED by `nameContains` — dropping `volumeCm3` would silently zero metal pricing. Distinct
 * from the M3-T2 `…/customizable` route, which authors the customizable block itself. Admin/dev gated.
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const base = Array.isArray(body.meshMap) ? body.meshMap : null;
  if (!base) return NextResponse.json({ error: 'meshMap (array) is required.' }, { status: 400 });

  const merged = mergeBaseMeshMap(base, design.viewer?.meshMap || []);
  const updated = await DesignsModel.setViewer(designID, { meshMap: merged, glbUrl: body.glbUrl });
  return NextResponse.json({ design: updated }, { status: 200 });
};
