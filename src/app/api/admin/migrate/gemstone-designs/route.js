import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { migrateGemstoneListingsToDesigns } from '@/lib/migrations/gemstoneListingsToDesigns';

/**
 * POST /api/admin/migrate/gemstone-designs   { dryRun?: boolean }
 * Elevate legacy products/gemstone listings into gemstone Designs (+ cut Pieces). Defaults to a
 * DRY RUN (no writes) — pass { dryRun: false } to commit. Admin/dev only.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false; // default: dry run
  try {
    const result = await migrateGemstoneListingsToDesigns({ dryRun });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Migration failed' }, { status: 500 });
  }
};
