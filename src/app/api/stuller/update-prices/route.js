import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { runMaterialPriceSync } from '@/app/api/materials/bulk-update-pricing/service';
// STAFF-ONLY. Every gate in this file was `session.user?.email?.includes('@')` — i.e. ANY
// authenticated user with a plausible email, including an artisan or a client, passed it. These
// endpoints carry pricing/catalog/credential data. The idiom appeared at 24 sites across 12 files;
// swept together rather than one at a time, which is how the last round's fix landed on the wrong
// sibling of this very file.

/**
 * POST /api/stuller/update-prices — refresh Stuller prices, through the ONE price sync
 * (api/materials/bulk-update-pricing/service.js runMaterialPriceSync).
 *
 * This used to run its own updater that REBUILT each variant as { stullerItemNumber, metalType, karat,
 * stullerPrice } — erasing `portionsPerUnit` and `unitCost`, so every material it touched priced a whole
 * Stuller item per use until someone re-entered the portions (EFD-DEFECTS P22; the same bug cost 8× on
 * sizing stock on 2026-09-01). The merge-only sync is now the only thing that writes Stuller prices.
 * `force` refreshes variants whose auto-update is switched off.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { force = false } = await request.json().catch(() => ({}));
    const { status, payload } = await runMaterialPriceSync(null, { force: force === true });
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('Stuller price update error:', error);
    return NextResponse.json(
      { error: 'Failed to update prices from Stuller', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stuller/update-prices
 * Return status of materials with Stuller auto-update enabled
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.connect();

    const materials = await db._instance
      .collection(Constants.MATERIALS_COLLECTION)
      .find({
        isActive: { $ne: false },
        $or: [
          {
            stullerProducts: {
              $elemMatch: {
                autoUpdatePricing: true,
                stullerItemNumber: { $exists: true, $ne: null }
              }
            }
          },
          {
            stullerProducts: {
              $elemMatch: {
                autoUpdatePricing: true,
                stuller_item_number: { $exists: true, $ne: null }
              }
            }
          },
          {
            stuller_item_number: { $exists: true, $ne: null },
            auto_update_pricing: true
          }
        ]
      })
      .project({
        displayName: 1,
        stullerProducts: 1,
        stuller_item_number: 1,
        unitCost: 1,
        last_price_update: 1,
        supplier: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length,
    });
  } catch (error) {
    console.error('Get Stuller update status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
