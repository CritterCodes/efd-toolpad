import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canReadPricingCatalog } from '@/lib/repairAccess';
import { loadPricingContext } from '@/services/pricing/catalog';
import { pricingContextPayload } from '@/services/pricing/clientContext';

/**
 * GET /api/pricing/context — what a repair is priced FROM, for the browser to price with the same engine
 * the server uses: the pricing settings, and the cost fields of the materials and tools catalogs. Loaded
 * by the same loadPricingContext the server prices with, so the two can't drift.
 *
 * Refuses (503) when the settings are missing or invalid — intake then refuses to open, rather than
 * pricing from defaults (owner, 2026-09-30: "Intake should never load without our settings").
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !canReadPricingCatalog(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const ctx = await loadPricingContext();
    return NextResponse.json(pricingContextPayload(ctx));
  } catch (error) {
    if (error?.name === 'PricingError') {
      return NextResponse.json({ error: error.message, code: error.code, missing: error.details?.missing || [] }, { status: 503 });
    }
    console.error('GET /api/pricing/context error:', error);
    return NextResponse.json({ error: 'Could not load pricing.' }, { status: 500 });
  }
}
