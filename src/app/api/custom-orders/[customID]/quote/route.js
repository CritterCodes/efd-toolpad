import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { syncQuoteHoursToWorkOrders } from '@/services/customs/customProduction';

/**
 * PUT /api/custom-orders/[customID]/quote
 * Body: quote inputs (materialCosts, laborCost, rushMultiplier, castingCost,
 * shippingCost, designFee, markup). Recomputes quoteTotal and returns order + margin.
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const quote = await req.json().catch(() => ({}));
  const updated = await CustomOrdersModel.updateById(customID, { quote });
  if (!updated) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  // Propagate edited labor hours to any already-generated (pre-QC) bench work orders so
  // their payout stays in sync with the plan. Non-fatal — never block saving the quote.
  let workOrdersSynced = 0;
  try {
    ({ updated: workOrdersSynced } = await syncQuoteHoursToWorkOrders({ customID }));
  } catch (e) {
    console.warn('[customs] quote→WO hour sync failed:', e.message);
  }

  const margin = await CustomOrdersModel.marginFor(customID);
  return NextResponse.json({ order: updated, margin, workOrdersSynced }, { status: 200 });
};
