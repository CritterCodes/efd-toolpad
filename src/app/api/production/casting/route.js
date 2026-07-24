import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import { createCastingBatch, CastingError } from '@/services/production/castingBoard';

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
  return NextResponse.json({ batches }, { status: 200 });
};

/**
 * POST /api/production/casting — open a casting batch for a run's pieces.
 * Body: { runId?, designID, pieceIDs[], inHouse?, vendor?, estCost? }. Owner = the caller (staff
 * may pass ownerId on behalf of an artisan).
 */
export const POST = async (req) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const ownerId = isStaff(session) && body.ownerId ? body.ownerId : session.user.userID;
  try {
    const batch = await createCastingBatch({
      runId: body.runId ?? null,
      ownerId,
      designID: body.designID,
      pieceIDs: body.pieceIDs,
      inHouse: body.inHouse === true,
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
