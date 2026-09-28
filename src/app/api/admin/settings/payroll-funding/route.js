/**
 * GET/PUT/POST /api/admin/settings/payroll-funding — the funding check's knobs
 * (services/payroll/payrollFunding.js). Admin/dev only.
 *
 *   GET  → settings + a live dry run, computed EVEN WHEN FUNDING IS OFF, so the card can say
 *          "Wednesday needs $X, Stripe has $Y" before you decide whether to turn it on.
 *   PUT  → save the knobs.
 *   POST → run the check FOR REAL, now. This is the button a person presses when they cannot wait
 *          for tomorrow's cron; it is the only path here that can move money, it requires funding to
 *          be switched on, and an ACH top-up still takes 1–2 business days to land.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readFundingSettings, writeFundingSettings, runFundingCheck, normalizeFundingSettings } from '@/services/payroll/payrollFunding';

export const dynamic = 'force-dynamic';

async function previewFunding() {
  try {
    return await runFundingCheck({ dryRun: true, preview: true, notify: false });
  } catch {
    return null;
  }
}

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const settings = await readFundingSettings();
  return NextResponse.json({ settings, preview: await previewFunding() });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const settings = await writeFundingSettings(normalizeFundingSettings(body), { actor: session.user.email || session.user.userID });
  return NextResponse.json({ settings, preview: await previewFunding() });
}

export async function POST() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  // Deliberately NOT a preview: pressing this pulls money. If funding is off the check declines on
  // its own, but say so plainly rather than returning a silent no-op.
  const settings = await readFundingSettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { error: 'Turn payroll funding on first — the check will not pull money while it is switched off.' },
      { status: 409 },
    );
  }

  const result = await runFundingCheck({ dryRun: false, notify: true });
  return NextResponse.json({ result, settings: result.settings });
}
