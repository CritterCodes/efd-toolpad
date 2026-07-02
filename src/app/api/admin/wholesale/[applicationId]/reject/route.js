// /api/admin/wholesale/[applicationId]/reject/route.js
import { updateWholesaleApplicationStatus, getWholesaleApplicationById } from '@/lib/wholesaleService.js';
import { requireRole } from '@/lib/apiAuth';
import { NotificationService } from '@/lib/notificationService';

export async function POST(request, { params }) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { applicationId } = params;
    const body = await request.json();
    const { reviewNotes } = body;

    if (!reviewNotes || reviewNotes.trim() === '') {
      return Response.json(
        { error: 'Review notes are required for rejection' },
        { status: 400 }
      );
    }

    // Check if application exists and is pending
    const application = await getWholesaleApplicationById(applicationId);
    if (!application) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return Response.json({ error: 'Application is not pending' }, { status: 400 });
    }

    // Update application status - keep role as 'wholesale-applicant' but mark as rejected
    const success = await updateWholesaleApplicationStatus(
      applicationId,
      'rejected',
      session.user.userID || session.user.email,
      reviewNotes
    );

    if (!success) {
      return Response.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log(`Wholesale application ${applicationId} rejected by ${session.user.email}`);

    // Best-effort rejection notification to the wholesaler (never blocks the response).
    try {
      const recipientUserId = application.accountUserID || application.userID || '';
      const recipientEmail = application.email || '';
      const businessName = application.businessName || `${application.firstName || ''} ${application.lastName || ''}`.trim();
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';

      await NotificationService.createNotification({
        userId: recipientUserId,
        type: 'wholesale-rejected',
        title: 'Update on your wholesale application',
        message: reviewNotes
          ? `Your wholesale application${businessName ? ` for ${businessName}` : ''} was not approved. Reason: ${reviewNotes}`
          : `Your wholesale application${businessName ? ` for ${businessName}` : ''} was not approved at this time.`,
        channels: ['inApp', 'email'],
        recipientEmail,
        priority: 'high',
        data: { businessName, reason: reviewNotes || '', actionUrl: `${adminUrl}/wholesale` },
      });
    } catch (notificationError) {
      console.error('⚠️ Failed to send wholesale rejection notification:', notificationError);
    }

    return Response.json({
      success: true,
      message: 'Application rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting wholesale application:', error);
    return Response.json({ error: 'Failed to reject application' }, { status: 500 });
  }
}
