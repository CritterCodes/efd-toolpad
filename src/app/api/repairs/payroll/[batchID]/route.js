import { NextResponse } from 'next/server';
import { payBatchViaConnect } from '@/services/payroll/connectPayouts';
import { requireRole } from '@/lib/apiAuth';
import {
  finalizePayrollBatch,
  getPayrollBatchDetail,
  markPayrollBatchPaid,
  voidPayrollBatch,
} from '../service';

export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const batch = await getPayrollBatchDetail(params.batchID);
    return NextResponse.json(batch, { status: 200 });
  } catch (error) {
    console.error('Error in payroll batch GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PATCH = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const action = body.action;
    let batch;

    if (action === 'finalize') {
      batch = await finalizePayrollBatch(params.batchID, { notes: body.notes });
    } else if (action === 'mark_paid') {
      // Owner, 2026-09-22: Stripe Connect is the only path. A batch is paid by transfer or not at all.
      return NextResponse.json({ error: 'Payroll is paid through Stripe Connect only. Have the payee connect their account; the batch is paid automatically.' }, { status: 400 });
    } else if (action === 'void') {
      batch = await voidPayrollBatch(params.batchID, { notes: body.notes });
    } else if (action === 'pay_stripe') {
      // Admin-initiated transfer for a finalized batch (same rules as the cron: live Stripe account,
      // enough balance). Marks the batch paid with the transfer id.
      const paid = await payBatchViaConnect({ batchID: params.batchID, actor: 'admin' });
      if (!paid.paid) return NextResponse.json({ error: `Not paid: ${paid.reason}.` }, { status: 400 });
      batch = await getPayrollBatchDetail(params.batchID);
    } else {
      return NextResponse.json({ error: 'Unsupported payroll batch action.' }, { status: 400 });
    }

    return NextResponse.json(batch, { status: 200 });
  } catch (error) {
    console.error('Error in payroll batch PATCH:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
