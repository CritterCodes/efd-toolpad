import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { removeAssignment } from '@/services/customs/customAssignment';

/** DELETE /api/custom-orders/[customID]/assignments/[assignmentID] — remove an assignment. */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, assignmentID } = await params;
  try {
    const order = await removeAssignment({ customID, assignmentID });
    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'NOT_FOUND' ? 404 : 500 });
  }
};
