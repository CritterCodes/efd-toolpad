import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { updateOwnerDraw } from '../service';

export const PATCH = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const draw = await updateOwnerDraw(params.drawID, {
      amount: body.amount,
      drawDate: body.drawDate,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      notes: body.notes,
      status: body.status,
    });

    return NextResponse.json(draw, { status: 200 });
  } catch (error) {
    console.error('Error in owner draw PATCH route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
