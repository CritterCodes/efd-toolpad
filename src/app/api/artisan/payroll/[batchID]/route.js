import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getPayrollBatchDetail } from '@/app/api/repairs/payroll/service';

export const GET = async (_req, { params }) => {
  try {
    const { session, errorResponse } = await requireRole(['artisan']);
    if (errorResponse) return errorResponse;

    const batch = await getPayrollBatchDetail(params.batchID);
    if (batch.userID !== session.user.userID) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    return NextResponse.json(batch, { status: 200 });
  } catch (error) {
    console.error('Error in artisan payroll batch route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
