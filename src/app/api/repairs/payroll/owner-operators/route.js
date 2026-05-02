import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { setOwnerOperatorFlag } from '../owner-draws/service';

export const PATCH = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const updated = await setOwnerOperatorFlag({
      userID: body.userID,
      isOwnerOperator: body.isOwnerOperator,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error in owner-operators PATCH route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
