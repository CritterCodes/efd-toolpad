import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { awardClientMgmtBonus, generateWorkOrdersFromQuote } from '@/services/customs/customProduction';

/** GET /api/custom-orders/[customID] — returns the order + live margin (quote − piece COGS) */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
  const margin = await CustomOrdersModel.marginFor(customID);
  return NextResponse.json({ order, margin }, { status: 200 });
};

/** PUT /api/custom-orders/[customID] — update fields (status changes append history) */
export const PUT = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await CustomOrdersModel.findById(customID);
  let updated = await CustomOrdersModel.updateById(customID, body, {
    changedBy: session.user.userID || session.user.email || '',
    reason: body.statusReason || '',
  });
  if (!updated) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });

  // Quote plans the work: reaching production generates bench WOs from the quote (idempotent).
  if (updated.status === 'in_production' && existing?.status !== 'in_production') {
    try { await generateWorkOrdersFromQuote({ customID }); } catch (e) { console.error('generateWorkOrdersFromQuote failed:', e.message); }
  }
  // On completion, award the client-management bonus (C8) — best-effort.
  if (updated.status === 'completed' && existing?.status !== 'completed') {
    try {
      await awardClientMgmtBonus({ customID });
      updated = await CustomOrdersModel.findById(customID);
    } catch (e) {
      console.error('Client-management bonus award failed:', e.message);
    }
  }
  return NextResponse.json(updated, { status: 200 });
};
