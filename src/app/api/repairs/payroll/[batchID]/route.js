import { NextResponse } from 'next/server';
import { payBatchViaConnect } from '@/services/payroll/connectPayouts';
import { requireRole } from '@/lib/apiAuth';
import {
  finalizePayrollBatch,
  getPayrollBatchDetail,
  markPayrollBatchPaid,
  voidPayrollBatch,
} from '../service';

/** How a batch may be settled outside Stripe. An unrecognised method is refused, not stored. */
export const MANUAL_PAYMENT_METHODS = ['cash', 'check', 'transfer', 'other'];

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
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const action = body.action;
    let batch;

    if (action === 'finalize') {
      batch = await finalizePayrollBatch(params.batchID, { notes: body.notes });
    } else if (action === 'mark_paid') {
      // PAID BY HAND. Reopened 2026-09-29 at the owner's request, narrowing the 2026-09-22 rule that
      // Stripe Connect was the only path. That rule was written when every payee could hold a Stripe
      // account; an hourly apprentice handed cash on her first day is the case it did not anticipate.
      //
      // What the rule was actually protecting against was SILENT settlement — a batch quietly marked
      // paid with nothing behind it. So the path is open but never silent: the method is required and
      // must be one we recognise, and the person who recorded it is stamped from the session, not the
      // payload. A transfer still records itself through payBatchViaConnect below.
      const method = String(body.paymentMethod || '').trim().toLowerCase();
      if (!MANUAL_PAYMENT_METHODS.includes(method)) {
        return NextResponse.json(
          { error: `How was it paid? Use one of: ${MANUAL_PAYMENT_METHODS.join(', ')}.` },
          { status: 400 },
        );
      }
      batch = await markPayrollBatchPaid(params.batchID, {
        paymentMethod: method,
        paymentReference: String(body.paymentReference || '').trim(),
        paidBy: session.user.email || session.user.userID || '',
        notes: body.notes,
      });
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
