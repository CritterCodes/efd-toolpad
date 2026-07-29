// /api/admin/artisans/[applicationId]/route.js
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { updateArtisanApplicationStatus, getArtisanApplicationById, deleteArtisanApplication } from '../../../../../lib/artisanService.js';

/**
 * Review a single artisan application — STAFF ONLY on every verb.
 *
 * `middleware.js` skips `/api/*`, so these handlers own their auth. Until they did, this was a
 * PRIVILEGE ESCALATION: the shop returns the applicationId to the applicant in its submit response,
 * and `PATCH {status:'approved'}` sets `role: 'artisan'` (artisanService §updateArtisanApplicationStatus),
 * so an applicant could approve themselves onto the platform with no admin involved. GET leaked
 * applicant PII and DELETE reset roles, both unauthenticated.
 */

/** Statuses a reviewer may set. An allowlist, so an arbitrary string can never land in the record. */
const REVIEWABLE_STATUSES = ['pending', 'approved', 'rejected'];

export async function GET(request, { params }) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { applicationId } = params;
    const application = await getArtisanApplicationById(applicationId);
    
    if (!application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }
    
    return Response.json(application);
  } catch (error) {
    console.error('Error in GET /api/admin/artisans/[applicationId]:', error);
    return Response.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { session, errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { applicationId } = params;
    // `reviewedBy` is deliberately NOT destructured from the body. The admin client hardcodes it to
    // the string 'admin-dashboard', so the audit trail recorded nothing real — and a body-supplied
    // reviewer is self-attested anyway. Approving an artisan grants platform access; the record of
    // who did it has to come from the authenticated session.
    const { status, reviewNotes } = await request.json();

    if (!REVIEWABLE_STATUSES.includes(status)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${REVIEWABLE_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }
    const reviewedBy = session.user.email || session.user.userID || 'unknown';

    const success = await updateArtisanApplicationStatus(applicationId, status, reviewedBy, reviewNotes);

    if (!success) {
      return Response.json({ error: 'Failed to update application' }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/admin/artisans/[applicationId]:', error);
    return Response.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { applicationId } = params;
    const success = await deleteArtisanApplication(applicationId);
    
    if (!success) {
      return Response.json({ error: 'Failed to delete application' }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/artisans/[applicationId]:', error);
    return Response.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}