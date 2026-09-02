import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import ArtisanInvoicesModel, { ARTISAN_INVOICE_STATUS } from '../../model';
import { markArtisanInvoicePaid } from '@/services/production/artisanBilling';

/**
 * POST /api/artisanInvoices/[invoiceID]/resolve — the missing exit from an invoiced state.
 *
 * body: { action: 'mark-paid' | 'void', reason?: string }
 *
 * WHY THIS IS THE BLOCKER FOR WORK-ORDER BILLING. castingSettlement states the invariant this rail
 * lives by: "every exit from an invoiced state must resolve the invoice… Getting this wrong is worse
 * than never billing at all." Casting ships all three sides (bill on receive, settle on pay, void on
 * cancel). Work orders shipped none of the exits, so `billCompletedWorkOrder` was written, tested, and
 * then deliberately left switched off at QC pass — a raised invoice would go overdue at +14 days and
 * freeze the artisan out of mintRun / requestDesignCad / casting-create with nothing in-product able to
 * clear it. This route is that missing surface.
 *
 * mark-paid goes through `markArtisanInvoicePaid`, NOT the model directly, because paying a casting
 * invoice must also clear that batch's shipping gate (nothing-ships-unpaid). Calling markPaid here
 * would resolve the money and silently strand the parcel.
 *
 * Admin/dev only: recording payment and voiding a receivable are both money decisions. Deliberately
 * narrower than STAFF_ROLES.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const { invoiceID } = await params;
    if (!invoiceID) {
      return NextResponse.json({ error: 'Invoice ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== 'mark-paid' && action !== 'void') {
      return NextResponse.json({ error: "action must be 'mark-paid' or 'void'." }, { status: 400 });
    }

    const invoice = await ArtisanInvoicesModel.findById(invoiceID);
    if (!invoice) {
      return NextResponse.json({ error: 'Artisan invoice not found.' }, { status: 404 });
    }

    // Terminal states are terminal. Re-resolving would rewrite paidAt/voidedAt — and for a casting
    // invoice, re-running mark-paid would re-clear a shipping gate that may since have been re-held.
    if (invoice.status === ARTISAN_INVOICE_STATUS.PAID) {
      return NextResponse.json({ error: 'Invoice is already paid.' }, { status: 409 });
    }
    if (invoice.status === ARTISAN_INVOICE_STATUS.VOID) {
      return NextResponse.json({ error: 'Invoice is already void.' }, { status: 409 });
    }

    if (action === 'mark-paid') {
      const paid = await markArtisanInvoicePaid(invoiceID);
      return NextResponse.json({ success: true, invoice: paid }, { status: 200 });
    }

    const actor = session?.user?.email || session?.user?.name || 'staff';
    const reason = typeof body.reason === 'string' && body.reason.trim()
      ? `${body.reason.trim()} (${actor})`
      : `voided by ${actor}`;
    const voided = await ArtisanInvoicesModel.markVoid(invoiceID, reason);
    return NextResponse.json({ success: true, invoice: voided }, { status: 200 });
  } catch (error) {
    console.error('Error resolving artisan invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
