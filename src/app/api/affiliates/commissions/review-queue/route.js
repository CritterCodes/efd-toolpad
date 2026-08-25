import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listReviewQueue } from '@/services/affiliates/commissionEngine';

/**
 * GET /api/affiliates/commissions/review-queue — admin only.
 *
 * Commissions that couldn't be priced automatically and are waiting on a profit
 * figure, across every affiliate, oldest first. Admin-only because it spans
 * affiliates: an affiliate must never see another's orders or earnings.
 */
export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const data = await listReviewQueue();
  return NextResponse.json({ success: true, data });
}
