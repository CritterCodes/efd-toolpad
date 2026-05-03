import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getLowStockItems, listReorderSuggestions } from '@/services/inventoryWorkflow';

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const [items, suggestions] = await Promise.all([
      getLowStockItems(),
      listReorderSuggestions({ status: 'open' }),
    ]);

    return NextResponse.json({ items, suggestions }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory low-stock GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
