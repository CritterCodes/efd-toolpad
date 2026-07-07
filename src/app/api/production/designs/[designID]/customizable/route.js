import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { unboundSlots } from '@/services/production/customizableBindings';

/**
 * PUT /api/production/designs/[designID]/customizable  (M3-T2 / decision 0005 §6)
 * Persist the Customizer authoring output on the design's viewer config: the refrakt-native
 * `meshMap` (each customizable slot carries `customizable:{options,default,label?}`) with admin's
 * per-option cost `binding`s layered on (metalKey per finish; gemstoneId|materialRef+carat per gem).
 * Body: `{ meshMap, glbUrl? }` (what `<ConfiguratorSetup>` emits + admin's binding editor merges via
 * `annotateBindings`). Admin/dev gated. Returns `unboundSlots` (by `nameContains`) so the authoring UI
 * can warn — the live-pricing endpoint 422s an unbound slot's selection (0005 §10).
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const meshMap = Array.isArray(body.meshMap) ? body.meshMap : null;
  if (!meshMap) return NextResponse.json({ error: 'meshMap (array) is required.' }, { status: 400 });

  const updated = await DesignsModel.setViewer(designID, { meshMap, glbUrl: body.glbUrl });
  return NextResponse.json({ design: updated, unboundSlots: unboundSlots(meshMap) }, { status: 200 });
};
