import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import {
  generateReorderSuggestions,
  listReorderSuggestions,
} from '@/services/inventoryWorkflow';

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const suggestions = await listReorderSuggestions();
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory reorder suggestions GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const suggestions = await generateReorderSuggestions({
      inventoryItemIDs: Array.isArray(body.inventoryItemIDs) ? body.inventoryItemIDs : [],
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json({ suggestions }, { status: 201 });
  } catch (error) {
    console.error('Error in inventory reorder suggestions POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
