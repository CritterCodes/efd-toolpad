import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { NotificationService } from '@/lib/notificationService';

/** GET /api/custom-orders/[customID]/communications — list messages (both threads). */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
  return NextResponse.json(order.communications || [], { status: 200 });
};

/** POST /api/custom-orders/[customID]/communications — add a message to a thread. */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!String(body.text || '').trim()) {
    return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
  }
  const message = await CustomOrdersModel.addCommunication(customID, {
    text: body.text,
    author: session.user.name || session.user.email || session.user.userID || 'admin',
    authorUserID: session.user.userID || null,
    thread: body.thread,
    direction: 'outbound',
  });
  // X4 — admin→client message: notify the client when an admin posts to their thread.
  // This POST only ever writes outbound (admin-authored) messages; inbound client posts
  // come through the shop, so there's no risk of notifying on an inbound message here.
  // Fire-and-forget — never block the message write.
  if ((message.thread || 'client') === 'client' && order.clientID) {
    try {
      await NotificationService.createNotification({
        userId: order.clientID,
        type: 'custom-message',
        title: 'New message about your custom piece',
        message: `You have a new message about "${order.title || 'your custom piece'}".`,
        channels: ['inApp', 'email'],
        recipientEmail: order.customerEmail,
        priority: 'normal',
        data: { actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/custom-work/portal`, customID },
      });
    } catch (e) {
      console.error('⚠️ custom-message notification failed:', e.message);
    }
  }
  return NextResponse.json(message, { status: 201 });
};
