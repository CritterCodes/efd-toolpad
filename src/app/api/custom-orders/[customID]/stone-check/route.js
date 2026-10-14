import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { recordStoneCheck } from '@/services/customs/payOverTime';

/**
 * POST /api/custom-orders/[customID]/stone-check — staff record a pay-over-time stone check.
 * Body: { status: 'available' | 'sold' | 'purchased', note? }. The client is emailed straight away
 * (rules §13; docs/manufacturing/PAY_OVER_TIME_CONTRACT.md §5).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const order = await recordStoneCheck(customID, {
      status: body?.status,
      note: body?.note || '',
      by: session.user.userID || session.user.email || '',
    });
    if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
    return NextResponse.json({ order }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.code === 'BAD_REQUEST' ? 400 : 500 });
  }
};
