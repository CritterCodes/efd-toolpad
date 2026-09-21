import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { notifyWholesaleInvoiceFinalized } from '@/services/wholesale/invoiceNotifications';
import { finalizeInvoiceFulfillment } from '@/services/shipping/invoiceShipping';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403 };

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

/**
 * POST /api/repair-invoices/[invoiceID]/finalize  { method: 'pickup' | 'ship', rateId? }
 *
 * Finalize is the fulfillment decision (owner, 2026-09-21). Pickup, or Ship with one of the rates
 * quoted via …/shipping/rates — the chosen rate becomes `shippingFee` at cost, so the total the
 * store is told about (and the paper in the box) already includes it. Hand delivery is not offered.
 * Omitting `method` finalizes as pickup, which is what the old bare Finalize did.
 */
export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const { invoiceID } = await params;
    const body = await req.json().catch(() => ({}));
    const updated = await finalizeInvoiceFulfillment({
      invoiceID,
      method: body?.method || 'pickup',
      rateId: body?.rateId || '',
      actor: { userID: session.user.userID, name: session.user.name },
    });

    // Finalize is the moment a wholesale draft becomes a bill the partner owes — tell them
    // (in-app + push + email). Best-effort and deduped by the partnerNotifiedAt stamp, so a
    // re-finalize can't spam; the summary rides back so the closeout UI can report delivery
    // honestly instead of assuming it.
    const notification = await notifyWholesaleInvoiceFinalized(updated);

    return NextResponse.json({ ...updated, notification }, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || 400;
    console.error('Error finalizing repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
