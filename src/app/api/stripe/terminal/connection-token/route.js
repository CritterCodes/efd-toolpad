import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { createTerminalConnectionToken } from '@/app/api/repair-invoices/stripe';

async function requireTerminalAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async () => {
  try {
    const { errorResponse } = await requireTerminalAccess();
    if (errorResponse) return errorResponse;

    const token = await createTerminalConnectionToken();
    return NextResponse.json({ secret: token.secret }, { status: 200 });
  } catch (error) {
    console.error('Error creating Stripe Terminal connection token:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
