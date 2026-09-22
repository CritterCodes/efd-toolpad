/**
 * GET/PUT /api/admin/settings/payroll-funding — the Thursday funding check's knobs
 * (services/payroll/payrollFunding.js). GET also returns a live dry run so the card can show
 * "Monday needs $X, Stripe has $Y". Admin/dev only.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readFundingSettings, writeFundingSettings, runFundingCheck, normalizeFundingSettings } from '@/services/payroll/payrollFunding';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const settings = await readFundingSettings();
  let preview = null;
  try {
    // Preview with the check forced on so the numbers show even while the switch is off.
    preview = settings.enabled ? await runFundingCheck({ dryRun: true, notify: false }) : null;
  } catch { preview = null; }
  return NextResponse.json({ settings, preview });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const settings = await writeFundingSettings(normalizeFundingSettings(body), { actor: session.user.email || session.user.userID });
  return NextResponse.json({ settings });
}
