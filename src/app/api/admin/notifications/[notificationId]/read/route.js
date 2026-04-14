import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markNotificationAsRead } from '../../../../../../../lib/notificationService.js';

/**
 * POST /api/admin/notifications/[notificationId]/read
 * Mark notification as read
 */
export async function POST(request, { params }) {
  try {
    const { notificationId } = await params;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await markNotificationAsRead(notificationId, session.user.userID);

    if (!result) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
