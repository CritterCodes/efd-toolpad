// /api/admin/wholesale/[applicationId]/reject/route.js
import { updateWholesaleApplicationStatus, getWholesaleApplicationById } from '../../../../../../lib/wholesaleService.js';
import { auth } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reject wholesale applications
    if (session.user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // TODO: Send rejection email to user with reason

    return Response.json({
      success: true,
      message: 'Application rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting wholesale application:', error);
    return Response.json({ error: 'Failed to reject application' }, { status: 500 });
  }
}