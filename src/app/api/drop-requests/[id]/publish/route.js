import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';

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
      const artisans = await db.collection('users')
        .find({ role: 'artisan', isActive: { $ne: false } })
        .project({ _id: 1, email: 1, name: 1, userID: 1 })
        .toArray();

      for (const artisan of artisans) {
        await NotificationService.createNotification({
          userId: artisan.userID || artisan._id.toString(),
          type: NOTIFICATION_TYPES.DROP_REQUEST_NEW,
          title: 'New Drop Opportunity',
          message: `New drop "${result.value.theme}" is now open for submissions!`,
          channels: ['inApp', 'email'],
          templateName: 'drop-request-new',
          recipientEmail: artisan.email,
          data: {
            dropTheme: result.value.theme,
            dropDescription: result.value.description,
            userRole: 'artisan',
            relatedType: 'drop-request',
          },
        });
      }
      console.log(`✅ Drop opportunity notifications sent to ${artisans.length} artisans`);
    } catch (notifError) {
      console.error('⚠️ Failed to send drop notifications:', notifError.message);
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
