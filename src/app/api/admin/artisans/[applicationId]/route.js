// /api/admin/artisans/[applicationId]/route.js
import { updateArtisanApplicationStatus, getArtisanApplicationById, deleteArtisanApplication } from '../../../../../lib/artisanService.js';

export async function GET(request, { params }) {
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
  try {
    const { applicationId } = params;
    const { status, reviewedBy, reviewNotes } = await request.json();
    
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