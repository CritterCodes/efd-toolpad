/**
 * GET /api/payouts/mine — the signed-in user's own payroll batches (any role: artisans, affiliates,
 * the owner). Affiliates earn commissions as payroll entries, so this is their earnings history too.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { listPayrollHistory } from '@/app/api/repairs/payroll/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  try {
    const batches = await listPayrollHistory({ userID: session.user.userID });
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not load payouts.' }, { status: 500 });
  }
}
