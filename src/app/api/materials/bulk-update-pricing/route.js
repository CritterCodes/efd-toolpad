import { NextResponse } from 'next/server';
import { runMaterialPriceSync } from './service';
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * STAFF ONLY. Unauthenticated, this was a catalog-wide MONEY WRITE: runMaterialPriceSync()
 * re-prices every active material and spends EFD's stored Stuller credentials to do it.
 */

export async function POST(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    let adminSettings;
    try {
      const body = await request.json();
      adminSettings = body?.adminSettings || null;
    } catch {
      // empty body — service will fetch settings from DB
    }

    const { status, payload } = await runMaterialPriceSync(adminSettings);
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('❌ Error updating material pricing:', error);
    return NextResponse.json({ error: 'Failed to update material pricing' }, { status: 500 });
  }
}
