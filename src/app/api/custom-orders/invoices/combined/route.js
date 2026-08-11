import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { createCombinedInvoice } from '@/services/customs/customInvoices.service';

/**
 * POST /api/custom-orders/invoices/combined
 * Body: { customIDs: [...], type?, depositPct?, amounts?: {customID: amount}, dueDays? }
 *
 * One invoice across several orders so a client with two pieces in pays once. Deliberately NOT nested
 * under a single [customID] — it belongs to all of them, and nesting it would imply a primary that the
 * caller had to pick.
 */
export const POST = async (req) => {
  const { errorResponse, session } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  try {
    const result = await createCombinedInvoice(body.customIDs, {
      ...body,
      createdBy: session?.user?.userID || session?.user?.email || null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
