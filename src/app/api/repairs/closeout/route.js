import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { getCloseoutRepairs } from '@/app/api/repair-invoices/service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const GET = async () => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const repairs = await getCloseoutRepairs();
    return NextResponse.json(repairs, { status: 200 });
  } catch (error) {
    console.error('Error loading closeout repairs:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
