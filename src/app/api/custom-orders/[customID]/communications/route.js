import { NextResponse, after } from 'next/server';
import { requireCustomsCadWrite, requireCustomsRead } from '@/lib/customsPermissions';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { NotificationService } from '@/lib/notificationService';
import { portalLink } from '@/lib/appUrls';

// Room for the client's email and push to finish AFTER the answer has gone out (see POST).
export const maxDuration = 60;

/** GET /api/custom-orders/[customID]/communications — list messages (both threads). */
export const GET = async (req, { params }) => {
  const { customID } = await params;
  // Read access: staff, or an artisan ASSIGNED to this order (full visibility — owner 2026-07-22).
  const { errorResponse } = await requireCustomsRead(customID);
  if (errorResponse) return errorResponse;

  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
  return NextResponse.json(order.communications || [], { status: 200 });
};

/** POST /api/custom-orders/[customID]/communications — add a message to a thread. */
export const POST = async (req, { params }) => {
  const { customID } = await params;
  // Staff, or THIS order's assigned CAD designer. Owner, 2026-10-02: "Cad designers can use
  // communications." Until then this was admin/dev only, which also made the client-management bonus
  // unpayable: awardClientMgmtBonus pays the designer only if they authored an outbound client-thread
  // message, and an artisan could not author one.
  const { session, errorResponse } = await requireCustomsCadWrite(customID);
  if (errorResponse) return errorResponse;

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
  // X4 — notify the client when EFD posts to their thread, whoever wrote it: an admin or the order's
  // CAD designer. This POST only ever writes OUTBOUND messages; inbound client posts come through the
  // shop, so there is no risk of notifying on an inbound message here.
  //
  // AFTER the answer, never before it. The comment here used to say "fire-and-forget" over an `await`: on
  // 2026-11-10 the email/push step hung, the request was killed at 15 seconds, and the owner was shown "Failed to
  // send" for a message that had been saved — one tap from sending it to the client twice. The message is written;
  // that is the answer. Telling the client about it happens once the response has gone.
  if ((message.thread || 'client') === 'client' && order.clientID) after(async () => {
    try {
      await NotificationService.createNotification({
        userId: order.clientID,
        type: 'custom-message',
        title: 'New message about your custom piece',
        message: `You have a new message about "${order.title || 'your custom piece'}".`,
        channels: ['inApp', 'email'],
        recipientEmail: order.customerEmail,
        priority: 'normal',
        data: { actionUrl: portalLink(customID, 'messages'), customID },
      });
    } catch (e) {
      console.error('⚠️ custom-message notification failed:', e.message);
    }
  });
  return NextResponse.json(message, { status: 201 });
};
