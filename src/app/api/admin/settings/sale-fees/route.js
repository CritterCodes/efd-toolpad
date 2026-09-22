/**
 * GET/PUT /api/admin/settings/sale-fees — EFD's cut on a sale through the shop (services/billing/feeSettings.js):
 * consignment (EFD holds + ships), marketplace (artisan holds + ships), and the hybrid pillars. Rates are
 * fractions (0.2 = 20%). Admin/dev only; same pattern as /settings/qc.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readSaleFees, writeSaleFees } from '@/services/billing/feeSettings';
import { DEFAULT_FEE_SCHEDULE } from '@/services/billing/feeSchedule';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  return NextResponse.json({ schedule: await readSaleFees(), defaults: DEFAULT_FEE_SCHEDULE });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  try {
    const schedule = await writeSaleFees(body?.schedule || body, { actor: session.user.email || session.user.userID });
    return NextResponse.json({ schedule });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
