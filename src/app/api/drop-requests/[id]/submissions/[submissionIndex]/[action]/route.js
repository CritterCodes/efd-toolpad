import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../../lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { notifyArtisanSelectedForDrop, notifyArtisanNotSelectedForDrop } from '@/lib/notificationService';

/**
 * POST /api/drop-requests/:id/submissions/:submissionIndex/approve
 * Approve artisan submission for drop
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can approve
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can approve submissions' },
        { status: 403 }
      );
    }

    const { id, submissionIndex, action } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const index = parseInt(submissionIndex);
    if (isNaN(index) || index < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission index' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    const { db } = await connectToDatabase();

    // Get drop request
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    if (!dropRequest.submissions || !dropRequest.submissions[index]) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = dropRequest.submissions[index];

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only review pending submissions' },
        { status: 400 }
      );
    }

    // Update submission status
    const updatePath = `submissions.${index}`;
    
    if (action === 'approve') {
      // Add artisan to selectedArtisans
      const result = await db.collection('drop-requests').findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            [updatePath]: {
              ...submission,
              status: 'approved',
              selectedAt: new Date(),
              notes: notes || ''
            }
          },
          $push: {
            selectedArtisans: {
              artisanId: submission.artisanId,
              artisanName: submission.artisanName,
              artisanEmail: submission.artisanEmail,
              productIds: submission.productIds,
              approvedAt: new Date(),
              approvedBy: session.user.id
            },
            selectedProducts: {
              $each: submission.productIds.map(pid => ({
                productId: pid,
                artisanId: submission.artisanId,
                artisanName: submission.artisanName,
                addedAt: new Date()
              }))
            }
          }
        },
        { returnDocument: 'after' }
      );

      // Send 'artisan-selected-for-drop' notification
      try {
        // Get the drop request to get theme info
        const fullDropRequest = await db.collection('drop-requests').findOne({
          _id: new ObjectId(id)
        });
        
        await notifyArtisanSelectedForDrop(
          id,
          submission.artisanId,
          submission.artisanEmail,
          submission.artisanName,
          fullDropRequest?.theme || 'Curated Drop'
        );
        console.log('✅ Selection notification sent to artisan');
      } catch (notifError) {
        console.error('⚠️ Warning: Failed to send selection notification:', notifError);
        // Don't fail the request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'Submission approved',
        data: result.value
      });

    } else {
      // Reject
      const result = await db.collection('drop-requests').findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            [updatePath]: {
              ...submission,
              status: 'rejected',
              rejectedAt: new Date(),
              rejectionReason: notes || 'Does not fit drop aesthetic'
            }
          }
        },
        { returnDocument: 'after' }
      );

      // Send 'artisan-not-selected' notification
      try {
        // Get the drop request to get theme info
        const fullDropRequest = await db.collection('drop-requests').findOne({
          _id: new ObjectId(id)
        });
        
        await notifyArtisanNotSelectedForDrop(
          id,
          submission.artisanId,
          submission.artisanEmail,
          submission.artisanName,
          fullDropRequest?.theme || 'Curated Drop'
        );
        console.log('✅ Not-selected notification sent to artisan');
      } catch (notifError) {
        console.error('⚠️ Warning: Failed to send not-selected notification:', notifError);
        // Don't fail the request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'Submission rejected',
        data: result.value
      });
    }

  } catch (error) {
    console.error('Error reviewing submission:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
