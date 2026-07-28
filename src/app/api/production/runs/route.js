import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff, canManageDesign } from '@/lib/designPermissions';
import DesignsModel from '@/app/api/designs/model';
import RunsModel, { RUN_STATUS } from '@/app/api/runs/model';
import { mintPlannedRun, spawnRunWorkOrders } from '@/services/production/productionRun';
import { EditionCapacityError } from '@/services/production/editionCapacity';

/** GET /api/production/runs — scoped: staff see all; an artisan sees runs they created or collaborate on. */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { searchParams } = new URL(req.url);
  const filter = {};
  if (!isStaff(session)) filter.$or = [{ createdBy: session.user.userID }, { collaborators: session.user.userID }];
  if (searchParams.get('designID')) filter.designID = searchParams.get('designID');
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  const runs = await RunsModel.list(filter);
  return NextResponse.json({ runs }, { status: 200 });
};

/**
 * POST /api/production/runs — plan a run. A SOLO run (design has no collaborators) mints
 * immediately; a COLLABORATIVE run is created PLANNED and awaits every collaborator's signature
 * (§4e) before /mint. Body: { designID, items:[{variantId,qty}], payoutSplit? }.
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const design = await DesignsModel.findById(body.designID);
  if (!design) return NextResponse.json({ error: 'Design not found.' }, { status: 404 });
  if (!canManageDesign(session, design)) return NextResponse.json({ error: 'Access denied — not your design.' }, { status: 403 });

  const collaborators = Array.isArray(design.collaborators) ? design.collaborators.filter(Boolean) : [];
  const createdBy = session.user.userID;
  let run;
  try {
    run = await RunsModel.create({
      designID: body.designID,
      createdBy,
      items: body.items,
      solo: collaborators.length === 0,
      collaborators,
      payoutSplit: body.payoutSplit ?? null,
      signatures: [{ userID: createdBy, at: new Date() }],   // the creator signs on creation
      status: RUN_STATUS.PLANNED,
    });
  } catch (e) {
    if (e instanceof TypeError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // Solo → mint now (already "fully signed"). Collab → return the plan for signatures.
  if (collaborators.length === 0) {
    try {
      const database = await db.connect();
      const client = db.client;
      const minted = await mintPlannedRun({ client, database, runId: run.runId, createdByForFreeze: createdBy });
      await spawnRunWorkOrders(minted.run, { assignToUserID: createdBy });
      return NextResponse.json({ run: minted.run, minted: true }, { status: 201 });
    } catch (e) {
      if (e instanceof EditionCapacityError) return NextResponse.json({ error: e.message, runId: run.runId }, { status: 409 });
      throw e;
    }
  }
  return NextResponse.json({ run, minted: false }, { status: 201 });
};
