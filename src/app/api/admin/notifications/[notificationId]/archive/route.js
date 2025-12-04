import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { NotificationService } from '@/lib/notificationService';

/**
 * POST /api/admin/notifications/[notificationId]/archive
 * Archive notification
 */
export async function POST(request, { params }) {
  try {
    const { notificationId } = await params;
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const success = await NotificationService.archiveNotification(notificationId);

    if (!success) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification archived'
    });

  } catch (error) {
    console.error('❌ Error archiving notification:', error);
    return NextResponse.json(
      { error: 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
