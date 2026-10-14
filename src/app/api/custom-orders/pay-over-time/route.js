import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listOverTime } from '@/services/customs/payOverTime';

/**
 * GET /api/custom-orders/pay-over-time — every open pay-over-time order with its payments, stages,
 * monthly clock, stone status and the chores it implies. Backs /dashboard/customs/pay-over-time.
 */
export const GET = async () => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const rows = await listOverTime();
  return NextResponse.json({
    orders: rows.map(({ order, progress, ladder, clock, stoneDue, chores }) => ({
      customID: order.customID,
      title: order.title || order.quote?.mounting?.item || '',
      customerName: order.customerName || order.clientName || '',
      customerEmail: order.customerEmail || '',
      status: order.status,
      pathChosenAt: order.payment?.pathChosenAt || null,
      overdueSince: order.payment?.overdueSince || null,
      stoneCheck: order.stoneCheck ? { status: order.stoneCheck.status, checkedAt: order.stoneCheck.checkedAt } : null,
      stoneItem: order.quote?.centerstone?.item || '',
      followsMarket: !!order.quote?.mounting?.metal,
      pricedAt: order.quote?.pricedAt || null,
      progress: {
        projectTotal: progress.projectTotal, totalPaid: progress.totalPaid, remainingAmount: progress.remainingAmount,
        paymentProgress: progress.paymentProgress, readyForProduction: progress.readyForProduction,
      },
      ladder,
      clock,
      stoneDue,
      chores,
    })),
  }, { status: 200 });
};
