import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';

/** GET /api/custom-orders — list (optional ?status= / ?clientID=) */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter = {};
  const status = searchParams.get('status');
  const clientID = searchParams.get('clientID');
  if (status) filter.status = status;
  if (clientID) filter.clientID = clientID;
  const orders = await CustomOrdersModel.list(filter);
  return NextResponse.json(orders, { status: 200 });
};

/** POST /api/custom-orders — create a new custom order */
export const POST = async (req) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  if (!body?.customerName && !body?.clientID) {
    return NextResponse.json({ error: 'clientID or customerName is required.' }, { status: 400 });
  }
  const order = await CustomOrdersModel.create({
    ...body,
    createdBy: session.user.userID || session.user.email || '',
  });
  return NextResponse.json(order, { status: 201 });
};
