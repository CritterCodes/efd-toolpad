import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';

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
    thread: body.thread,
    direction: 'outbound',
  });
  // TODO (C-comms): fire-and-forget client notification for client-thread messages
  // (mirror customInvoices.service notifications) once the message NOTIFICATION_TYPE is wired.
  return NextResponse.json(message, { status: 201 });
};
