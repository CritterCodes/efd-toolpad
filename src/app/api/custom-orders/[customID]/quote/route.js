import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { syncQuoteToWorkOrders } from '@/services/customs/customProduction';

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

  // Reconcile any already-generated (pre-QC) bench work orders with the edited plan:
  // update hours, append added tasks, cull removed ones, spawn WOs for new lanes.
  // Non-fatal — never block saving the quote.
  let wo = { updated: 0, spawned: 0, removed: 0 };
  try {
    wo = await syncQuoteToWorkOrders({ customID });
  } catch (e) {
    console.warn('[customs] quote→WO sync failed:', e.message);
  }

  const margin = await CustomOrdersModel.marginFor(customID);
  return NextResponse.json({ order: updated, margin, workOrdersSync: wo, workOrdersSynced: wo.updated }, { status: 200 });
};
