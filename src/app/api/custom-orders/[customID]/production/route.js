import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { addProductionToCustomOrder } from '@/services/customs/customProduction';

/**
 * POST /api/custom-orders/[customID]/production
 * Spawns a Design + Piece (with routed work orders) from the custom order and links
 * them back. The piece's work orders hit the unified bench → labor pays via payroll
 * (owner draw) → COGS accrues → order margin.
 * Body: { designID?, metalType?, karat?, routing? }
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const result = await addProductionToCustomOrder(customID, {
      ...body,
      createdBy: session.user.userID || session.user.email || '',
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
