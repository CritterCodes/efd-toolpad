import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { estimateDesignCost } from '@/services/production/designCost';

/** Read the live per-gram metal prices (24k gold / .999 silver basis). */
async function getMetalPrices() {
  const dbInstance = await db.connect();
  const doc = await dbInstance.collection('metalPrices').findOne({});
  return {
    gold: Number(doc?.gold) || 0,
    silver: Number(doc?.silver) || 0,
    platinum: Number(doc?.platinum) || 0,
    palladium: Number(doc?.palladium) || 0,
  };
}

/**
 * POST /api/production/designs/estimate
 * Body: { stlVolumeCm3, metalKey, bom?, estLaborHours?, laborRate? }
 * Returns the design cost estimate using live metal prices.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const { stlVolumeCm3, metalKey, bom = {}, estLaborHours = 0, laborRate = 0 } = body;
  if (!metalKey) return NextResponse.json({ error: 'metalKey is required.' }, { status: 400 });

  const metalPrices = await getMetalPrices();
  try {
    const estimate = estimateDesignCost({ stlVolumeCm3, metalKey, metalPrices, bom, estLaborHours, laborRate });
    return NextResponse.json({ estimate, metalPrices }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
