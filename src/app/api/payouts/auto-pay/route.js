/**
 * PATCH /api/payouts/auto-pay { userID, autoPay } — admin/dev switch: pay this payee's finalized
 * payroll batches automatically through Stripe Connect (services/payroll/connectPayouts.js).
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { setAutoPay } from '@/services/payroll/connectPayouts';

export async function PATCH(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const userID = String(body?.userID || '').trim();
  if (!userID || typeof body?.autoPay !== 'boolean') {
    return NextResponse.json({ error: 'userID and boolean autoPay are required.' }, { status: 400 });
  }
  const result = await setAutoPay({ userID, autoPay: body.autoPay, actor: session.user.email || session.user.userID });
  return NextResponse.json(result);
}
