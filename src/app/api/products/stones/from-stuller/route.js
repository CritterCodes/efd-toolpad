import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import StullerItemService from '@/app/api/stuller/item/service';
import { StonesModel, stoneFromStullerItem } from '../model';

/**
 * POST /api/products/stones/from-stuller  { itemNumber }
 * Look up a Stuller SKU, map it to a stone-SKU record (wholesale cost + specs), and upsert
 * it into the reorderable stone catalog (deduped by SKU). Returns the catalog record.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { itemNumber } = await req.json().catch(() => ({}));
  if (!itemNumber || !String(itemNumber).trim()) {
    return NextResponse.json({ error: 'A Stuller SKU (itemNumber) is required.' }, { status: 400 });
  }

  try {
    const item = await StullerItemService.fetchItemData(String(itemNumber).trim());
    const mapped = stoneFromStullerItem(item);
    if (!mapped.stullerSku) mapped.stullerSku = String(itemNumber).trim();
    const stone = await StonesModel.upsertBySku(mapped);
    return NextResponse.json({ success: true, stone }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to look up the Stuller SKU.' },
      { status: error.status || 502 },
    );
  }
};
