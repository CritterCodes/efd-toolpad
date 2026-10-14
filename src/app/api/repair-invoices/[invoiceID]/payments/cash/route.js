import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { computePaymentStatus, syncPaidRepairs, invoiceGrossTotal } from '@/app/api/repair-invoices/service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const amount = parseFloat(body.amount || 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: 'Cash payment amount must be greater than 0.' }, { status: 400 });
    }

    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);
    // Shared helper — includes the carrier shipping fee (see invoiceGrossTotal).
    const grossTotal = invoiceGrossTotal(invoice);
    // CASH DISCOUNT REMOVED (owner, 2026-09-04): cash payments no longer round the
    // total down to the nearest $5. A discount already STORED on an old open invoice
    // is still honored — that total was already quoted to the customer.
    const cashDiscountAmount = parseFloat(invoice.cashDiscountAmount || 0);
    const invoiceTotal = Math.max(grossTotal - cashDiscountAmount, 0);
    const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    payments.push({
      type: 'cash',
      amount,
      receivedAt: new Date(),
      receivedBy: session.user.name || session.user.email || '',
      notes: body.notes || '',
      status: 'completed',
    });

    // ONLY COMPLETED MONEY COUNTS. Every other payment route on this invoice filters on status; this
    // one did not, so an abandoned terminal intent sitting at `pending` was added to the cash the
    // customer actually handed over. Measured in production 2026-10-13: three invoices overstated by
    // $754.32 between them, each one a cash payment taken after a terminal attempt was given up on
    // (rinv-bca435de +$566.99, rinv-498455fe +$146.13, rinv-96c7c681 +$41.20).
    //
    // It inflated reported collections, and it could have done worse: amountPaid feeds
    // computePaymentStatus, so a large enough pending intent would mark an invoice PAID while the
    // customer still owed the difference. In the three real cases the completed payment happened to
    // cover the total, so nothing was written off — that was luck, not design.
    const amountPaid = payments
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    const { paymentStatus, remainingBalance } = computePaymentStatus(invoiceTotal, amountPaid);

    let updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      payments,
      cashDiscountApplied: invoice.cashDiscountApplied === true,
      cashDiscountAmount,
      total: invoiceTotal,
      amountPaid,
      paymentStatus,
      remainingBalance,
      status: paymentStatus === 'paid' ? 'paid' : 'open',
      paidAt: paymentStatus === 'paid' ? new Date() : invoice.paidAt || null,
    });

    updated = await syncPaidRepairs(updated);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error recording cash payment:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
