import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import RunsModel from '@/app/api/runs/model';
import { mintPlannedRun, spawnRunWorkOrders, cancelRun, scrapPiece } from '@/services/production/productionRun';
import { EditionCapacityError } from '@/services/production/editionCapacity';

/**
 * POST /api/production/runs/[runId]/[action] — sign | mint | cancel | scrap.
 * - sign: a collaborator (or creator) signs the run (§4e dual-signature).
 * - mint: mint the planned run once fully signed (creator/staff).
 * - cancel: release the whole run (creator/staff).
 * - scrap: scrap one pre-sale piece, body.pieceID (creator/staff).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { runId, action } = await params;
  const run = await RunsModel.findById(runId);
  if (!run) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });

  const uid = session.user.userID;
  const staff = isStaff(session);
  const isCreator = run.createdBy === uid;
  const isCollaborator = (run.collaborators || []).includes(uid);
  const body = await req.json().catch(() => ({}));

  const database = await db.connect();
  const client = db.client;

  try {
    if (action === 'sign') {
      if (!staff && !isCreator && !isCollaborator) {
        return NextResponse.json({ error: 'Only a collaborator on this run can sign it.' }, { status: 403 });
      }
      const signatures = [...(run.signatures || [])];
      if (!signatures.some((s) => s.userID === uid)) signatures.push({ userID: uid, at: new Date() });
      const updated = await RunsModel.updateById(runId, { signatures });
      return NextResponse.json(updated, { status: 200 });
    }

    if (action === 'mint') {
      if (!staff && !isCreator) return NextResponse.json({ error: 'Only the run creator can mint.' }, { status: 403 });
      const minted = await mintPlannedRun({ client, database, runId, createdByForFreeze: run.createdBy });
      await spawnRunWorkOrders(minted.run, { assignToUserID: run.createdBy });
      return NextResponse.json({ run: minted.run, minted: true }, { status: 200 });
    }

    if (action === 'cancel') {
      if (!staff && !isCreator) return NextResponse.json({ error: 'Only the run creator can cancel.' }, { status: 403 });
      const result = await cancelRun({ client, database, runId });
      return NextResponse.json(result, { status: 200 });
    }

    if (action === 'scrap') {
      if (!staff && !isCreator) return NextResponse.json({ error: 'Only the run creator can scrap a piece.' }, { status: 403 });
      if (!body.pieceID) return NextResponse.json({ error: 'pieceID is required.' }, { status: 400 });
      if (!(run.pieceIDs || []).includes(body.pieceID)) return NextResponse.json({ error: 'That piece is not part of this run.' }, { status: 400 });
      const result = await scrapPiece({ client, database, pieceID: body.pieceID, reason: body.reason ?? null });
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    if (e instanceof EditionCapacityError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
};
