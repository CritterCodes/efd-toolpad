import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { castInHouse, markCastingReceived, orderFromCarrera } from '@/services/production/casting';

export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { pieceID } = await params;
  const body = await req.json().catch(() => ({}));
  const createdBy = session.user.userID || session.user.email || '';
  try {
    let result;
    if (body.action === 'order_carrera') result = await orderFromCarrera({ pieceID, ...body, createdBy });
    else if (body.action === 'cast_in_house') result = await castInHouse({ pieceID, ...body, createdBy });
    else if (body.action === 'mark_received') result = await markCastingReceived({ pieceID, ...body, createdBy });
    else { const error = new Error('Unknown casting action.'); error.code = 'BAD_REQUEST'; throw error; }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'BAD_REQUEST' ? 400 : 500 });
  }
};
