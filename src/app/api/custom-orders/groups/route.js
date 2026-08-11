import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';

/**
 * Order groups — several custom orders billed as ONE invoice.
 *
 * A client with two pieces in (two wedding bands; an engagement ring plus a band) should get one
 * invoice and swipe once. Grouping is INVOICING ONLY: each order keeps its own quote, pieces and work
 * orders, which is precisely what keeps a wedding set correct — one order stays one piece, so the
 * singular quote shape and per-piece work-order attribution are untouched.
 *
 * POST   { customIDs: [...] }  -> group them, returns { groupId }
 * DELETE ?customIDs=a,b        -> ungroup
 * GET    ?customID=x           -> orders that could be billed with x, plus its current group
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  try {
    const groupId = await CustomOrdersModel.groupOrders(body.customIDs, { groupId: body.groupId || null });
    return NextResponse.json({ groupId, orders: await CustomOrdersModel.listByGroup(groupId) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};

export const DELETE = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const customIDs = (new URL(req.url).searchParams.get('customIDs') || '').split(',').filter(Boolean);
  try {
    return NextResponse.json({ ungrouped: await CustomOrdersModel.ungroupOrders(customIDs) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};

export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const customID = new URL(req.url).searchParams.get('customID');
  if (!customID) return NextResponse.json({ error: 'customID is required.' }, { status: 400 });
  try {
    const order = await CustomOrdersModel.findById(customID);
    if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
    const [candidates, group] = await Promise.all([
      CustomOrdersModel.groupableWith(customID),
      CustomOrdersModel.listByGroup(order.orderGroupId),
    ]);
    return NextResponse.json({ groupId: order.orderGroupId || null, group, candidates }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
