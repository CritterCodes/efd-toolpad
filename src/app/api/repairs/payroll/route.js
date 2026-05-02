import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import {
  createPayrollBatch,
  getPayrollCandidateDetail,
  listPayrollCandidates,
  listPayrollHistory,
} from './service';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const history = searchParams.get('history') === 'true';
    const detail = searchParams.get('detail') === 'true';
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const userID = searchParams.get('userID');
    const status = searchParams.get('status');

    if (detail) {
      const candidate = await getPayrollCandidateDetail({ weekStart, userID });
      return NextResponse.json(candidate, { status: 200 });
    }

    if (history) {
      const batches = await listPayrollHistory({ status, userID, weekStart, weekEnd });
      return NextResponse.json(batches, { status: 200 });
    }

    const candidates = await listPayrollCandidates({ weekStart, weekEnd, userID });
    return NextResponse.json(candidates, { status: 200 });
  } catch (error) {
    console.error('Error in payroll route GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const batch = await createPayrollBatch({
      weekStart: body.weekStart,
      userID: body.userID,
      notes: body.notes || '',
      createdBy: session.user.userID,
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error('Error in payroll route POST:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
