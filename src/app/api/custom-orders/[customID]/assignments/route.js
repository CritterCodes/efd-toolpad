import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { assignArtisan } from '@/services/customs/customAssignment';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400 };

/** POST /api/custom-orders/[customID]/assignments — assign an artisan to a role. */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.userID) return NextResponse.json({ error: 'userID is required.' }, { status: 400 });
  try {
    const order = await assignArtisan({
      customID,
      userID: body.userID,
      role: body.role,
      fee: body.fee,
      assignedBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: CODE_STATUS[error.code] || 500 });
  }
};
