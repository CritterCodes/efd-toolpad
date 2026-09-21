import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { previewTermination, terminateArtisan } from '@/services/users/terminateArtisan';
import { userIdentityQuery } from '../../model';
import { db } from '@/lib/database';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403 };

/**
 * GET  /api/users/[userID]/terminate  — preview: what terminating this person would touch.
 * POST /api/users/[userID]/terminate  — do it. Body: { reason }.
 *
 * Admin/dev only, like the capability grant route: this is the inverse of granting access to
 * money and other people's work. The route param may be a Mongo _id or a userID (the artisan
 * list navigates by _id) — userIdentityQuery handles both.
 */
export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;
    const { userID } = await params;
    const dbInstance = await db.connect();
    const user = await dbInstance.collection('users').findOne(userIdentityQuery(userID), { projection: { _id: 0, userID: 1, status: 1 } });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    const preview = await previewTermination(user.userID);
    return NextResponse.json({ userID: user.userID, status: user.status, ...preview }, { status: 200 });
  } catch (error) {
    console.error('Error previewing termination:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;
    const { userID } = await params;
    if (!userID) return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const result = await terminateArtisan({ userIdOrObjectId: userID, session, reason: body?.reason || '' });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 500;
    if (status === 500) console.error('Error terminating artisan:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
