import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getPayrollDiagnostics } from '../service';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const diagnostics = await getPayrollDiagnostics({ weekStart });
    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    console.error('Error in payroll diagnostics route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
