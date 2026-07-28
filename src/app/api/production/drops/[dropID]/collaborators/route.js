import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import DropsModel from '@/app/api/drops/model';
import { canManageDrop } from '@/lib/dropPermissions';
import { applyCollaboratorChange } from '@/services/production/dropCollaborators';

/**
 * POST /api/production/drops/[dropID]/collaborators — add/remove a collaborator on a drop.
 * Body: { add?: userID, remove?: userID }. Staff or the owning artisan only (canManageDrop).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { dropID } = await params;
  const drop = await DropsModel.findById(dropID);
  if (!drop) return NextResponse.json({ error: 'Drop not found.' }, { status: 404 });
  if (!canManageDrop(session, drop)) return NextResponse.json({ error: 'Access denied — not your drop.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!body.add && !body.remove) return NextResponse.json({ error: 'Provide add or remove (a userID).' }, { status: 400 });

  const collaborators = applyCollaboratorChange(drop.collaborators, {
    add: body.add ?? null, remove: body.remove ?? null, ownerId: drop.ownerId,
  });
  const updated = await DropsModel.updateById(dropID, { collaborators });
  return NextResponse.json(updated, { status: 200 });
};
