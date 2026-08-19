import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { requireCustomsRead } from '@/lib/customsPermissions';
import { createCustomInvoice, getCustomPaymentProgress } from '@/services/customs/customInvoices.service';
import { drainShopPaymentCredits } from '@/services/customs/shopPaymentCredits';

/** GET /api/custom-orders/[customID]/invoices — invoices + payment progress */
export const GET = async (req, { params }) => {
  const { customID } = await params;
  // Read access: staff, or an artisan ASSIGNED to this order (full visibility — owner 2026-07-22).
  const { errorResponse } = await requireCustomsRead(customID);
  if (errorResponse) return errorResponse;

  try {
    // Opportunistic: settle any shop-checkout payment credits for this order BEFORE
    // computing progress, so what the screen shows already reflects the shop payment's
    // threshold advance + receipt. Best-effort — the cron is the guaranteed consumer.
    await drainShopPaymentCredits({ customID }).catch(() => {});
    const result = await getCustomPaymentProgress(customID);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
};

/** POST /api/custom-orders/[customID]/invoices — create invoice (deposit/progress/final/partial) */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await createCustomInvoice(customID, { ...body, createdBy: session.user.userID || session.user.email || '' });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
