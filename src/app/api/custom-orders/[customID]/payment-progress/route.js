import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getCustomPaymentProgress } from '@/services/customs/customInvoices.service';

/** GET /api/custom-orders/[customID]/payment-progress — % paid + 50% production-ready flag */
export const GET = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { customID } = await params;
  try {
    const { progress } = await getCustomPaymentProgress(customID);
    return NextResponse.json(progress, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
};
