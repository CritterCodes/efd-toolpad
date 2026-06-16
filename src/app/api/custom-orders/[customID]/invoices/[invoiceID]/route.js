import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { setCustomInvoiceStatus } from '@/services/customs/customInvoices.service';

/**
 * PUT /api/custom-orders/[customID]/invoices/[invoiceID]
 * Body: { status: 'paid' | 'pending_payment' | 'cancelled' }
 * Marking paid recomputes progress, fires notifications, and advances the order
 * (deposit → in_production at 50%).
 */
export const PUT = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID, invoiceID } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.status) return NextResponse.json({ error: 'status is required.' }, { status: 400 });
  try {
    const result = await setCustomInvoiceStatus(customID, invoiceID, body.status);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
