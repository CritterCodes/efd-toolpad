import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { loadPricingContext } from '@/services/pricing/catalog';
import { estimateTasks } from '@/services/pricing/estimate';

/**
 * POST /api/pricing/estimate — efd-shop's online repair estimate, by THE engine.
 *
 * Server-to-server only, behind the shared pricing secret the shop already sends to /api/refrakt-price
 * (`x-efd-pricing-key` = EFD_PRICING_KEY). Body: { taskIds: string[], metals?: [{ metalType, karat,
 * goldColor }], sizeCount?: number }. Returns each task's retail per metal it can be priced in.
 * Missing pricing settings → 503: the shop then shows no online price rather than a guessed one.
 */
const MAX_TASKS = 25;

export async function POST(req) {
  const key = process.env.EFD_PRICING_KEY;
  if (!key) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  if (req.headers.get('x-efd-pricing-key') !== key) return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = (Array.isArray(body?.taskIds) ? body.taskIds : [])
    .slice(0, MAX_TASKS)
    .map((id) => { try { return new ObjectId(String(id)); } catch { return null; } })
    .filter(Boolean);
  if (!ids.length) return NextResponse.json({ success: true, tasks: [] });
  const sizeCount = Math.max(1, Math.min(6, Number(body?.sizeCount) || 1));
  const metals = Array.isArray(body?.metals) ? body.metals.slice(0, 20) : [];

  try {
    const ctx = await loadPricingContext();
    const { db } = await import('@/lib/database');
    const dbi = await db.connect();
    const tasks = await dbi.collection('tasks').find({ _id: { $in: ids }, isActive: { $ne: false } }).toArray();
    return NextResponse.json({ success: true, tasks: estimateTasks({ tasks, ctx, metals, sizeCount }) });
  } catch (error) {
    if (error?.name === 'PricingError') return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('POST /api/pricing/estimate error:', error);
    return NextResponse.json({ error: 'Could not price.' }, { status: 500 });
  }
}
