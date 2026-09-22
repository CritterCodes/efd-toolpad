/**
 * GET/PUT /api/admin/settings/custom-fees — custom-order fee defaults (services/billing/feeSettings.js):
 * the client-management bonus share (financial.clientMgmtBonusPct) and the QC review fee
 * (financial.qcReviewFee). Admin/dev only; same pattern as /settings/qc.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readCustomFees, writeCustomFees, CUSTOM_FEE_DEFAULTS } from '@/services/billing/feeSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  return NextResponse.json({ fees: await readCustomFees(), defaults: CUSTOM_FEE_DEFAULTS });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  try {
    const fees = await writeCustomFees(body?.fees || body, { actor: session.user.email || session.user.userID });
    return NextResponse.json({ fees });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
