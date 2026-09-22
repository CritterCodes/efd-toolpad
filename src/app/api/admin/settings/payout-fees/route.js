/**
 * GET/PUT /api/admin/settings/payout-fees — what a DAILY payout costs the payee
 * (services/payroll/payoutCadence.js): Stripe's flat + percent (passed through) and EFD's flat fee.
 * Weekly payouts are always free to the payee. Admin/dev only.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readFeeSettings, writeFeeSettings, dailyFeeLabel, computeDailyPayout } from '@/services/payroll/payoutCadence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const fees = await readFeeSettings();
  return NextResponse.json({ fees, label: dailyFeeLabel(fees), example: computeDailyPayout({ gross: 100, fees }) });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const fees = await writeFeeSettings(body, { actor: session.user.email || session.user.userID });
  return NextResponse.json({ fees, label: dailyFeeLabel(fees), example: computeDailyPayout({ gross: 100, fees }) });
}
