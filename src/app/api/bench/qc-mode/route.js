/**
 * GET /api/bench/qc-mode — what the bench should offer this session: the shop's QC mode and
 * whether THIS caller may self-certify under it (services/repairs/qcMode.js). Any repair-ops staff.
 */
import { NextResponse } from 'next/server';
import { requireRepairOps } from '@/lib/apiAuth';
import { readQcMode, canSelfCertify } from '@/services/repairs/qcMode';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { session, errorResponse } = await requireRepairOps();
  if (errorResponse) return errorResponse;
  const mode = await readQcMode();
  return NextResponse.json({ mode, canSelfCertify: canSelfCertify({ session, mode }) });
}
