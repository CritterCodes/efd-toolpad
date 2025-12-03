import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { notifyArtisansAboutDrop } from '../../../../../lib/notificationService.js';

/**
 * POST /api/drop-requests/:id/publish
 * Publish drop request - sends invites to artisans
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

    // Only admins can publish
    if (!['admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can publish drop requests' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drop request ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const dropRequest = await db.collection('drop-requests').findOne({
      _id: new ObjectId(id)
    });

    if (!dropRequest) {
      return NextResponse.json(
        { success: false, error: 'Drop request not found' },
        { status: 404 }
      );
    }

    // Can't publish archived or already published
    if (['published', 'archived'].includes(dropRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot publish ${dropRequest.status} drop request` },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!dropRequest.theme || !dropRequest.opensAt || !dropRequest.closesAt) {
      return NextResponse.json(
        { success: false, error: 'Drop request incomplete - missing required fields' },
        { status: 400 }
      );
    }

    // Update status to open
    const result = await db.collection('drop-requests').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'open',
          publishedAt: new Date(),
          publishedBy: session.user.id,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // Send notifications to all artisans about the drop opportunity
    try {
      await notifyArtisansAboutDrop(
        result.value._id.toString(),
        result.value.theme,
        result.value.description
      );
      console.log('✅ Drop opportunity notifications sent to all artisans');
    } catch (notifError) {
      console.error('⚠️ Warning: Failed to send drop opportunity notifications:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Drop request published and invites sent to artisans',
      data: result.value
    });

  } catch (error) {
    console.error('Error publishing drop request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
