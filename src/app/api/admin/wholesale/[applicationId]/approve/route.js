// /api/admin/wholesale/[applicationId]/approve/route.js
import { updateWholesaleApplicationStatus, getWholesaleApplicationById } from '../../../../../../lib/wholesaleService.js';
import { auth } from '../../../../../../../auth';

export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can approve wholesale applications
    if (session.user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Update application status
    const success = await updateWholesaleApplicationStatus(
      applicationId,
      'approved',
      session.user.userID || session.user.email,
      reviewNotes
    );

    if (!success) {
      return Response.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log(`Wholesale application ${applicationId} approved by ${session.user.email}`);

    // TODO: Send approval email to user
    // TODO: Update Shopify customer with wholesale tags (if needed)

    return Response.json({
      success: true,
      message: 'Application approved successfully'
    });

  } catch (error) {
    console.error('Error approving wholesale application:', error);
    return Response.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}