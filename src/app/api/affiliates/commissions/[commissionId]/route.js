import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { approveCommission, voidCommission } from '@/services/affiliates/commissionEngine';

/**
 * PATCH /api/affiliates/commissions/[commissionId] — admin only.
 * Body: { action: 'approve', profit }  → computes amount at the snapshotted rate,
 *       writes the payroll payout entry, marks the commission earned.
 *       { action: 'void', reason? }    → rejects it (refund, all-custom cart, mistake).
 *       A commission whose payout already rides payroll refuses to void — clawbacks go
 *       through payroll deliberately, never a silent delete.
 */
export async function PATCH(request, { params }) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { commissionId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.action === 'approve') {
      const profit = Number(body.profit);
      if (!Number.isFinite(profit) || profit < 0) {
        return NextResponse.json({ success: false, error: 'profit must be a non-negative number.' }, { status: 400 });
      }
      const result = await approveCommission({
        commissionId, profit, approvedBy: session.user.userID || session.user.email,
      });
      return NextResponse.json({ success: true, data: result });
    }
    if (body.action === 'void') {
      const result = await voidCommission({
        commissionId, reason: body.reason || '', voidedBy: session.user.userID || session.user.email,
      });
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json({ success: false, error: 'action must be "approve" or "void".' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
