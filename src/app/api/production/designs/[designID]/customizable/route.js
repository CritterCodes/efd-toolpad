import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DesignsModel from '@/app/api/designs/model';
import { canManageDesign } from '@/lib/designPermissions';
import { unboundSlots, customizableSlots } from '@/services/production/customizableBindings';

/**
 * Customizer authoring (M3-T2 / decision 0005 §6).
 *
 * Persists what the authoring screen produces on the design's viewer config: the refrakt-native
 * `meshMap`, where each customizable slot carries `customizable:{options,default,label?}` with
 * admin's per-option cost `binding`s layered on (metalKey per finish; gemstoneId|materialRef+carat
 * per gem). refrakt authors appearance; admin owns price.
 *
 * This route and its screen were orphaned when Designs moved under Drops — everything downstream
 * (the live-pricing endpoint's strict binding resolution, the shop's customize page and PDP gate)
 * kept reading `design.viewer.meshMap`, which nothing wrote any more.
 */

/** GET — the authored slots + which options are still missing a cost binding. */
export const GET = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }

  const meshMap = design.viewer?.meshMap || [];
  return NextResponse.json({
    glbUrl: design.viewer?.glbUrl || design.designModel?.glbUrl || null,
    meshMap,
    slots: customizableSlots(meshMap),
    unboundSlots: unboundSlots(meshMap),
  }, { status: 200 });
};

/**
 * PUT — save the authored meshMap. Body: `{ meshMap, glbUrl? }`.
 * Returns `unboundSlots` (by `nameContains`) so the screen can warn: the live-pricing endpoint
 * 422s a shopper's selection on any customizable option left unbound (0005 §10).
 */
export const PUT = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { designID } = await params;
  const design = await DesignsModel.findById(designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) {
    return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const meshMap = Array.isArray(body.meshMap) ? body.meshMap : null;
  if (!meshMap) return NextResponse.json({ error: 'meshMap (array) is required.' }, { status: 400 });

  const updated = await DesignsModel.setViewer(designID, { meshMap, glbUrl: body.glbUrl });
  return NextResponse.json({
    design: updated,
    unboundSlots: unboundSlots(meshMap),
    slots: customizableSlots(meshMap),
  }, { status: 200 });
};
