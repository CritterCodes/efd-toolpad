import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '../../../../../auth';

// POST /api/admin/wholesale/[applicationId]/approve - Approve wholesale application
export async function POST(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can approve wholesale applications
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { applicationId } = params;
    const body = await request.json();
    const { reviewNotes = '' } = body;

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

    // Update user record
    const updateResult = await db.collection('users').updateOne(
      { 'wholesaleApplication.applicationId': applicationId },
      {
        $set: {
          role: 'wholesaler', // Change role from 'wholesale-applicant' to 'wholesaler'
          'wholesaleApplication.status': 'approved',
          'wholesaleApplication.reviewedAt': now,
          'wholesaleApplication.approvedAt': now,
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

    console.log(`Wholesale application ${applicationId} approved by ${session.user.email}`);

    // TODO: Send approval email to user
    // TODO: Update Shopify customer with wholesale tags (if needed)

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully'
    });

  } catch (error) {
    console.error('Error approving wholesale application:', error);
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    );
  }
}