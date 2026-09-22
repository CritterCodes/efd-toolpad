/**
 * GET/PUT /api/admin/settings/qc — the QC mode switch (services/repairs/qcMode.js).
 * Admin/dev only; separate from the PIN-gated numeric settings route, like /settings/shipping.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readQcMode, writeQcMode, QC_MODES, normalizeQcMode } from '@/services/repairs/qcMode';

export async function GET() {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const mode = await readQcMode();
  return NextResponse.json({ mode, modes: Object.values(QC_MODES), actor: session.user.email || session.user.userID });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  if (!Object.values(QC_MODES).includes(body?.mode)) {
    return NextResponse.json({ error: `mode must be one of ${Object.values(QC_MODES).join(', ')}` }, { status: 400 });
  }
  const mode = await writeQcMode(normalizeQcMode(body.mode), { actor: session.user.email || session.user.userID });
  return NextResponse.json({ mode });
}
