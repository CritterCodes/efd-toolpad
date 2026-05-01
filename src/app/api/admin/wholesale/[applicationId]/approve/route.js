// /api/admin/wholesale/[applicationId]/approve/route.js
import {
  getWholesaleApplicationById,
  mergeWholesaleApplicationIntoAccount,
  updateWholesaleApplicationStatus,
} from '../../../../../../lib/wholesaleService.js';
import { requireRole } from '@/lib/apiAuth';

export async function POST(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { applicationId } = params;
    const body = await request.json();
    const { reviewNotes = '' } = body;

    // Check if application exists and is pending
    const application = await getWholesaleApplicationById(applicationId);
    if (!application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return Response.json({ error: 'Application is not pending' }, { status: 400 });
    }

    const reviewedBy = session.user.userID || session.user.email;

    if (application.reconciliationState?.status === 'ambiguous') {
      return Response.json(
        {
          error: 'Application matches multiple active wholesale accounts. Resolve it in the reconciliation queue first.',
          reconciliationRequired: true,
          candidates: application.reconciliationState.candidates || [],
        },
        { status: 409 }
      );
    }

    if (application.reconciliationState?.status === 'safe_match' && application.reconciliationState.candidates?.length === 1) {
      const mergeResult = await mergeWholesaleApplicationIntoAccount({
        applicationId,
        targetUserId: application.reconciliationState.candidates[0].id,
        reviewedBy,
        reviewNotes,
      });

      return Response.json({
        success: true,
        merged: true,
        message: 'Application merged into existing wholesale account.',
        result: mergeResult,
      });
    }

    const success = await updateWholesaleApplicationStatus(
      applicationId,
      'approved',
      reviewedBy,
      reviewNotes
    );

    if (!success) {
      return Response.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log(`Wholesale application ${applicationId} approved by ${session.user.email}`);

    // TODO: Send approval email to user

    return Response.json({
      success: true,
      merged: false,
      message: 'Application approved successfully'
    });

  } catch (error) {
    console.error('Error approving wholesale application:', error);
    return Response.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}
