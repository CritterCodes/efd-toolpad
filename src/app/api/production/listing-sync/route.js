import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { syncDesignListing, syncAllListings } from '@/services/production/listingSync';

/**
 * POST /api/production/listing-sync — the self-healing sweep (PRODUCTS_ARE_PROJECTIONS.md P1).
 * Body: { designID? , dryRun? } — one design, or every design when designID is omitted.
 * Projections can always be rebuilt from scratch; this is the manual/ops entry point.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  if (body.designID) {
    const report = await syncDesignListing(body.designID, { dryRun });
    return NextResponse.json(report, { status: 200 });
  }
  const summary = await syncAllListings({ dryRun });
  return NextResponse.json(summary, { status: 200 });
};
