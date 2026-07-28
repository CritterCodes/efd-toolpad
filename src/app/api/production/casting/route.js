import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import { createCastingBatch, CastingError } from '@/services/production/castingBoard';
import { isArtisanFrozen } from '@/services/production/artisanBilling';
import { enrichBatch } from '@/services/production/castingBoardView';

/**
 * Fetch each batch's design + pieces once per distinct id, then project via the pure `enrichBatch`
 * so a board card can show WHAT to order. An unresolvable batch still returns (reason in
 * `lineErrors`) rather than 500-ing the whole board.
 */
async function enrichBatches(batches) {
  const designIds = [...new Set(batches.map((b) => b.designID).filter(Boolean))];
  const designs = Object.fromEntries(
    (await Promise.all(designIds.map(async (id) => [id, await DesignsModel.findById(id).catch(() => null)])))
      .filter(([, d]) => d),
  );
  const pieceIds = [...new Set(batches.flatMap((b) => b.pieceIDs || []))];
  const pieces = Object.fromEntries(
    (await Promise.all(pieceIds.map(async (id) => [id, await PiecesModel.findById(id).catch(() => null)])))
      .filter(([, p]) => p),
  );

  return batches.map((b) => enrichBatch(b, designs[b.designID] || null, pieces));
}

/**
 * GET /api/production/casting — the ownership-scoped casting board. Staff see every batch; an
 * artisan sees only their own runs' batches. Optional ?runId / ?status filters.
 */
export const GET = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { searchParams } = new URL(req.url);
  const filter = {};
  if (!isStaff(session)) filter.ownerId = session.user.userID;
  if (searchParams.get('runId')) filter.runId = searchParams.get('runId');
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  const batches = await CastingBatchesModel.list(filter);
  return NextResponse.json({ batches: await enrichBatches(batches), isStaff: isStaff(session) }, { status: 200 });
};

/**
 * POST /api/production/casting — open a VENDOR casting batch for a run's pieces.
 * Body: { runId?, designID, pieceIDs[], vendor?, estCost? }. Owner = the caller (staff may pass
 * ownerId on behalf of an artisan). There is no in-house/self-cast variant — see the model.
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const ownerId = isStaff(session) && body.ownerId ? body.ownerId : session.user.userID;
  // Freeze: an artisan with an overdue bill can't open new castings (nothing new until paid).
  if (await isArtisanFrozen(ownerId)) {
    return NextResponse.json({ error: 'Account frozen — pay the overdue invoice before ordering casting.' }, { status: 402 });
  }
  try {
    const batch = await createCastingBatch({
      runId: body.runId ?? null,
      ownerId,
      designID: body.designID,
      pieceIDs: body.pieceIDs,
      vendor: body.vendor ?? null,
      estCost: body.estCost ?? null,
      createdBy: session.user.userID,
    });
    return NextResponse.json(batch, { status: 201 });
  } catch (e) {
    if (e instanceof CastingError || e instanceof TypeError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
};
