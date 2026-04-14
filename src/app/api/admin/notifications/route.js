import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserNotifications } from '../../../../../lib/notificationService.js';

/**
 * GET /api/admin/notifications
 * Retrieve notifications for the current user
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');
    const page = Math.floor(skip / limit) + 1;

    const result = await getUserNotifications(session.user.userID, {
      limit,
      page,
      unreadOnly: status === 'unread',
    });

    // Flatten inApp.read to top-level read for frontend compatibility
    const notifications = (result.notifications || []).map((n) => ({
      ...n,
      read: n.inApp?.read || false,
      link: n.actionUrl || null,
    }));

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        total: result.pagination?.total || 0,
        unreadCount,
        page: result.pagination?.page || 1,
        totalPages: result.pagination?.pages || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
