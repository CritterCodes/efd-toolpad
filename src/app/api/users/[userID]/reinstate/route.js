import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { reinstateArtisan } from '@/services/users/terminateArtisan';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403 };

/**
 * POST /api/users/[userID]/reinstate — let a terminated account sign in again. Restores sign-in
 * ONLY: capabilities and on-site stay off and are re-granted through the normal capability route.
 */
export const POST = async (_req, { params }) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;
    const { userID } = await params;
    if (!userID) return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    const result = await reinstateArtisan({ userIdOrObjectId: userID, session });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error('Error reinstating artisan:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
