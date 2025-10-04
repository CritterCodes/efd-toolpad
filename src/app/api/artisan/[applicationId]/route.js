import { NextResponse } from 'next/server';
import { 
  getArtisanApplicationById,
  updateArtisanApplicationStatus,
  deleteArtisanApplication
} from '../../../../lib/artisanService.js';
import { sendApplicationStatusEmail, sendWelcomeEmail } from '../../../../lib/emailService.js';

export async function GET(request, { params }) {
  try {
    const { applicationId } = params;
    
    const application = await getArtisanApplicationById(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching artisan application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { applicationId } = params;
    const body = await request.json();
    
    const { status, reviewedBy, reviewNotes } = body;
    
    if (!status || !reviewedBy) {
      return NextResponse.json(
        { success: false, error: 'Status and reviewedBy are required' },
        { status: 400 }
      );
    }
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be pending, approved, or rejected' },
        { status: 400 }
      );
    }
    
    const success = await updateArtisanApplicationStatus(
      applicationId, 
      status, 
      reviewedBy, 
      reviewNotes || ''
    );
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Application not found or update failed' },
        { status: 404 }
      );
    }
    
    // Get the updated application for email notification
    const application = await getArtisanApplicationById(applicationId);
    
    // Send email notification (non-blocking)
    try {
      await sendApplicationStatusEmail(application, status, reviewNotes);
      
      // Send welcome email for approved applications
      if (status === 'approved') {
        await sendWelcomeEmail(application);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Application ${status} successfully` 
    });
  } catch (error) {
    console.error('Error updating artisan application status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update application status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { applicationId } = params;
    
    const success = await deleteArtisanApplication(applicationId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Application not found or deletion failed' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Application deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting artisan application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}