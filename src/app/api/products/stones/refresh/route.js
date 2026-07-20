import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { StonesModel } from '../model';
import { refreshStonePrice, refreshAllStonePrices } from '../refresh.service';

/**
 * POST /api/products/stones/refresh
 *   { stoneSkuId }  → refresh one stone's wholesale cost from Stuller
 *   { all: true }   → refresh the whole Stuller-linked catalog
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  try {
    if (body.stoneSkuId) {
      const stone = await StonesModel.findById(body.stoneSkuId);
      if (!stone) return NextResponse.json({ error: 'Stone not found.' }, { status: 404 });
      const result = await refreshStonePrice(stone);
      return NextResponse.json({ success: true, result }, { status: 200 });
    }
    const summary = await refreshAllStonePrices();
    return NextResponse.json({ success: true, ...summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Refresh failed.' }, { status: error.status || 502 });
  }
};
