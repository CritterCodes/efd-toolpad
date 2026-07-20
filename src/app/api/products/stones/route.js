import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { StonesModel } from './model';

/** GET /api/products/stones?search= — search the reorderable stone-SKU catalog. */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const search = new URL(req.url).searchParams.get('search') || '';
  const stones = await StonesModel.list({ search });
  return NextResponse.json({ success: true, stones }, { status: 200 });
};

/** POST /api/products/stones — upsert a stone (manual entry or edited record), deduped by SKU. */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  if (!body.label && !body.stullerSku) {
    return NextResponse.json({ error: 'A label or Stuller SKU is required.' }, { status: 400 });
  }
  const stone = await StonesModel.upsertBySku(body);
  return NextResponse.json({ success: true, stone }, { status: 200 });
};

/** DELETE /api/products/stones?stoneSkuId= — remove a stone from the catalog. */
export const DELETE = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const stoneSkuId = new URL(req.url).searchParams.get('stoneSkuId');
  const deleted = await StonesModel.deleteById(stoneSkuId);
  return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
};
