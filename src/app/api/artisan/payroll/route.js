import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listPayrollHistory } from '@/app/api/repairs/payroll/service';

export const GET = async () => {
  try {
    const { session, errorResponse } = await requireRole(['artisan']);
    if (errorResponse) return errorResponse;

    const batches = await listPayrollHistory({ userID: session.user.userID });
    return NextResponse.json(batches, { status: 200 });
  } catch (error) {
    console.error('Error in artisan payroll route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
