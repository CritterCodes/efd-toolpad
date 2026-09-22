/**
 * GET/PUT /api/admin/settings/pay-ladder — the published pay ladder (services/pay/payLadder.js).
 * Admin/dev only for writes; reads too (the guide publishes the ladder to everyone via /api/guide).
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readLadder, writeLadder, DEFAULT_LADDER } from '@/services/pay/payLadder';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const ladder = await readLadder();
  return NextResponse.json({ ladder, defaults: DEFAULT_LADDER });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  try {
    const ladder = await writeLadder(body?.ladder || body, { actor: session.user.email || session.user.userID });
    return NextResponse.json({ ladder });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
