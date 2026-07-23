import { NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/apiAuth';
import { isStaff } from '@/lib/designPermissions';
import { customsListFilter } from '@/lib/customsPermissions';
import CustomOrdersModel from '@/app/api/custom-orders/model';

/** GET /api/custom-orders — list (optional ?status= / ?clientID=) */
export const GET = async (req) => {
  // Staff see everything; artisans see the custom orders they're ASSIGNED to (full visibility).
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!isStaff(session) && session.user.role !== 'artisan') {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filter = { ...customsListFilter(session) };
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
