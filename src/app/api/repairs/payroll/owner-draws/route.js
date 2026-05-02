import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import {
  createOwnerDraw,
  listOwnerDraws,
} from './service';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const data = await listOwnerDraws({
      userID: searchParams.get('userID') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      status: searchParams.get('status') || '',
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in owner draws route GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const draw = await createOwnerDraw({
      userID: body.userID,
      amount: body.amount,
      drawDate: body.drawDate,
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
      notes: body.notes || '',
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(draw, { status: 201 });
  } catch (error) {
    console.error('Error in owner draws route POST:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
