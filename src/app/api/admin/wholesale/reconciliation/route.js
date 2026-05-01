import { requireRole } from '@/lib/apiAuth';
import {
  backfillLegacyWholesalerProfile,
  dismissWholesaleMatchSuggestions,
  getWholesaleReconciliationReport,
  mergeWholesaleApplicationIntoAccount,
} from '@/lib/wholesaleService.js';

export async function GET() {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const report = await getWholesaleReconciliationReport();
    return Response.json(report);
  } catch (error) {
    console.error('Error in GET /api/admin/wholesale/reconciliation:', error);
    return Response.json({ error: 'Failed to load reconciliation report' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { action } = body;
    const reviewedBy = session.user.userID || session.user.email;

    if (action === 'backfill-legacy') {
      const result = await backfillLegacyWholesalerProfile({
        targetUserId: body.targetUserId,
        reviewedBy,
      });
      return Response.json({ success: true, result });
    }

    if (action === 'merge-application') {
      const result = await mergeWholesaleApplicationIntoAccount({
        applicationId: body.applicationId,
        targetUserId: body.targetUserId,
        reviewedBy,
        reviewNotes: body.reviewNotes || '',
      });
      return Response.json({ success: true, result });
    }

    if (action === 'dismiss-match') {
      const result = await dismissWholesaleMatchSuggestions({
        applicationId: body.applicationId,
        dismissedUserIds: Array.isArray(body.dismissedUserIds) ? body.dismissedUserIds : [],
        reviewedBy,
        reviewNotes: body.reviewNotes || '',
      });
      return Response.json({ success: true, result });
    }

    return Response.json({ error: 'Unsupported reconciliation action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/admin/wholesale/reconciliation:', error);
    return Response.json({ error: error.message || 'Failed to process reconciliation action' }, { status: 500 });
  }
}
