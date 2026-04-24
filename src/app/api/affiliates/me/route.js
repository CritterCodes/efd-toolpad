import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';

// GET /api/affiliates/me — returns the current user's affiliate profile
export async function GET() {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const col = await db.dbAffiliates();
  const affiliate = await col.findOne({ userId: session.user.userID });

  if (!affiliate) {
    return NextResponse.json({ success: false, error: 'No affiliate profile found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: affiliate });
}
