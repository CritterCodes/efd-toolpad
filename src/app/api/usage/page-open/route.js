import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { recordPageOpen } from '@/services/usage/pageOpens';

/**
 * POST /api/usage/page-open — count that a signed-in person opened a dashboard page (services/usage/pageOpens.js).
 * Best-effort: it never fails the page, so every outcome is a 204.
 */
export async function POST(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return new NextResponse(null, { status: 204 });
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.path === 'string') {
      await recordPageOpen(await db.connect(), { pathname: body.path, role: session.user.role });
    }
  } catch (error) {
    console.error('page-open log failed (ignored):', error?.message);
  }
  return new NextResponse(null, { status: 204 });
}
