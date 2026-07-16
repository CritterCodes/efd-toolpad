import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import {
  markCastingOrdered,
  createInHouseCastingWO,
  markCastingReceived,
} from '@/services/casting/castingService';

/**
 * POST /api/pieces/[pieceID]/casting
 * Body: { action: 'order_carrera' | 'cast_inhouse' | 'mark_received', ...params }
 *
 * order_carrera  → casting=ordered, piece.status=casting_ordered, businessExpenses entry, no WO.
 * cast_inhouse   → casting=ordered, creates discipline=casting WO (labor-credited via bench flow).
 * mark_received  → casting=received, material COGS line, expense, generates bench WOs (idempotent).
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { pieceID } = await params;
  const body = await req.json().catch(() => ({}));
  const createdBy = session.user.userID || session.user.email || '';

  try {
    let result;
    switch (body.action) {
      case 'order_carrera':
        result = await markCastingOrdered(pieceID, {
          vendor: body.vendor || 'Carrera',
          vendorPO: body.vendorPO || '',
          invoiceNumber: body.invoiceNumber || '',
          amount: body.amount || 0,
          paymentMethod: body.paymentMethod || 'other',
          status: body.status || 'paid',
          notes: body.notes || '',
          createdBy,
        });
        break;
      case 'cast_inhouse':
        result = await createInHouseCastingWO(pieceID, {
          title: body.title || null,
          estLaborHours: body.estLaborHours || 0,
          tasks: Array.isArray(body.tasks) ? body.tasks : null,
          createdBy,
        });
        break;
      case 'mark_received':
        result = await markCastingReceived(pieceID, {
          amount: body.amount,
          vendor: body.vendor || '',
          invoiceNumber: body.invoiceNumber || '',
          notes: body.notes || '',
          paymentMethod: body.paymentMethod || 'other',
          status: body.status || 'paid',
          createdBy,
        });
        break;
      default:
        return NextResponse.json(
          { error: 'action must be order_carrera | cast_inhouse | mark_received' },
          { status: 400 },
        );
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'BAD_REQUEST' ? 400 : error.code === 'NOT_FOUND' ? 404 : 500 },
    );
  }
};
