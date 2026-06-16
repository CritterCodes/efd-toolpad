import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { createCustomInvoice, getCustomPaymentProgress } from '@/services/customs/customInvoices.service';

/** GET /api/custom-orders/[customID]/invoices — invoices + payment progress */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  try {
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
  if (!body?.amount || Number(body.amount) <= 0) {
    return NextResponse.json({ error: 'A positive amount is required.' }, { status: 400 });
  }
  try {
    const result = await createCustomInvoice(customID, { ...body, createdBy: session.user.userID || session.user.email || '' });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
