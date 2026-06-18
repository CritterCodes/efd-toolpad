import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { addCastingCost } from '@/services/customs/customProduction';

/** POST /api/custom-orders/[customID]/casting — record a casting cost (→ COGS + expense ledger). */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await addCastingCost({
      customID,
      amount: body.amount,
      vendor: body.vendor || '',
      invoiceNumber: body.invoiceNumber || '',
      notes: body.notes || '',
      paymentMethod: body.paymentMethod || 'other',
      status: body.status || 'paid',
      createdBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'BAD_REQUEST' ? 400 : 500 });
  }
};
