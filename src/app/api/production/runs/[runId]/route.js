import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import RunsModel from '@/app/api/runs/model';

/** GET /api/production/runs/[runId] — the run's creator, a collaborator, or staff. */
export const GET = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { runId } = await params;
  const run = await RunsModel.findById(runId);
  if (!run) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });
  const uid = session.user.userID;
  if (!isStaff(session) && run.createdBy !== uid && !(run.collaborators || []).includes(uid)) {
    return NextResponse.json({ error: 'Access denied — not your run.' }, { status: 403 });
  }
  return NextResponse.json(run, { status: 200 });
};
