import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { getCustomPaymentProgress } from '@/services/customs/customInvoices.service';
import { drainShopPaymentCredits } from '@/services/customs/shopPaymentCredits';
import { gateLadder, invoicesForOrder, paymentClock } from '@/services/customs/paymentProgress';
import { stoneCheckDue } from '@/services/customs/payOverTime';

/**
 * GET /api/custom-orders/[customID]/payment-progress — % paid, the production threshold for this
 * order's payment path, and (for pay-over-time) the stages ladder, the monthly clock and whether the
 * stone needs checking. docs/manufacturing/PAY_OVER_TIME_CONTRACT.md.
 */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  try {
    // Settle any shop-checkout credits first (best-effort; cron is the backstop).
    await drainShopPaymentCredits({ customID }).catch(() => {});
    const { progress, invoices } = await getCustomPaymentProgress(customID);
    const order = await CustomOrdersModel.findById(customID);
    const ladder = gateLadder(order, progress.totalPaid);
    const clock = paymentClock(order, invoicesForOrder(invoices, customID), { remaining: progress.remainingAmount });
    return NextResponse.json({
      ...progress,
      ladder,
      clock,
      stoneDue: stoneCheckDue(order, ladder),
      stoneCheck: order?.stoneCheck || null,
      overdueSince: order?.payment?.overdueSince || null,
      overrides: order?.payment?.overrides || [],
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
};
