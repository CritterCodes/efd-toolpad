import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '../../../../../auth';

// POST /api/admin/wholesale/[applicationId]/reject - Reject wholesale application
export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reject wholesale applications
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { applicationId } = params;
    const body = await request.json();
    const { reviewNotes } = body;

    if (!reviewNotes || reviewNotes.trim() === '') {
      return NextResponse.json(
        { error: 'Review notes are required for rejection' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Find user with this application
    const user = await db.collection('users').findOne({
      'wholesaleApplication.applicationId': applicationId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (user.wholesaleApplication.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application is not pending' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update user record - keep role as 'wholesale-applicant' but mark as rejected
    const updateResult = await db.collection('users').updateOne(
      { 'wholesaleApplication.applicationId': applicationId },
      {
        $set: {
          'wholesaleApplication.status': 'rejected',
          'wholesaleApplication.reviewedAt': now,
          'wholesaleApplication.reviewedBy': session.user.userID || session.user.email,
          'wholesaleApplication.reviewNotes': reviewNotes,
          'wholesaleApplication.updatedAt': now,
          updatedAt: now
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    console.log(`Wholesale application ${applicationId} rejected by ${session.user.email}`);

    // TODO: Send rejection email to user with reason

    return NextResponse.json({
      success: true,
      message: 'Application rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting wholesale application:', error);
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    );
  }
}