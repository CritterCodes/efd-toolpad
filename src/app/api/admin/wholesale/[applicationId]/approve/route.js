// /api/admin/wholesale/[applicationId]/approve/route.js
import {
  getWholesaleApplicationById,
  mergeWholesaleApplicationIntoAccount,
  updateWholesaleApplicationStatus,
} from '@/lib/wholesaleService.js';
import { requireRole } from '@/lib/apiAuth';
import { NotificationService } from '@/lib/notificationService';

// Best-effort approval notification to the wholesaler (never blocks the response).
async function notifyWholesaleApproved(application) {
  try {
    const recipientUserId = application.accountUserID || application.userID || '';
    const recipientEmail = application.email || '';
    const businessName = application.businessName || `${application.firstName || ''} ${application.lastName || ''}`.trim();
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';

    await NotificationService.createNotification({
      userId: recipientUserId,
      type: 'wholesale-approved',
      title: 'Your wholesale application was approved',
      message: `Good news${businessName ? ` for ${businessName}` : ''}! Your wholesale account has been approved. You can now sign in and access wholesale pricing.`,
      channels: ['inApp', 'email'],
      recipientEmail,
      priority: 'high',
      data: { businessName, actionUrl: `${adminUrl}/dashboard` },
    });
  } catch (notificationError) {
    console.error('⚠️ Failed to send wholesale approval notification:', notificationError);
  }
}

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

      await notifyWholesaleApproved(application);

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

    await notifyWholesaleApproved(application);

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
