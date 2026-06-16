import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';

/** POST /api/custom-orders/[customID]/notes — add an internal note. */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!String(body.text || '').trim()) {
    return NextResponse.json({ error: 'Note text is required.' }, { status: 400 });
  }
  const note = await CustomOrdersModel.addNote(customID, {
    text: body.text,
    author: session.user.name || session.user.email || session.user.userID || 'admin',
    type: body.type,
    tags: body.tags,
  });
  return NextResponse.json(note, { status: 201 });
};
