// ============================================
// Notifications API Endpoint
// GET /api/notifications -> get all notifications + unread count
// POST /api/notifications -> mark notification read or mark all read
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  addNotification,
} from '@/lib/store/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = getNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Mark single notification read
    if (body.id) {
      const notifications = markAsRead(body.id);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return NextResponse.json({ success: true, notifications, unreadCount });
    }

    // Mark all notifications read
    if (body.markAllRead) {
      const notifications = markAllAsRead();
      return NextResponse.json({ success: true, notifications, unreadCount: 0 });
    }

    // Create new notification (admin or internal)
    if (body.title && body.orderNumber) {
      const notification = addNotification({
        title: body.title,
        message: body.message || `Order #${body.orderNumber} updated`,
        orderNumber: body.orderNumber,
        type: body.type || 'digitized',
        byUser: session.user?.email || undefined,
      });
      return NextResponse.json({ success: true, notification });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process notification request' },
      { status: 500 }
    );
  }
}
