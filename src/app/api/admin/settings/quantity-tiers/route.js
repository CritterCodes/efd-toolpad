/**
 * GET/PUT /api/admin/settings/quantity-tiers — the volume-pricing ladder (Store Settings).
 *
 * The rates are DATA, never code (owner, 2026-09-29: "this doesn't get hard coded, this needs to be
 * updated in the ui"). An unset ladder means no quantity pricing at all; `defaults` is offered so the
 * card can seed the form on first use, and is never applied behind anyone's back.
 *
 * Written with a dot path: `pricing` also holds the wage, the markups and the tax rate, and sending
 * the object back whole would delete whichever keys this route did not know about.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRole } from '@/lib/apiAuth';
import { normalizeQuantityTiers, tiersFromSettings, DEFAULT_QUANTITY_TIERS } from '@/services/pricing/quantityTiers';

export const dynamic = 'force-dynamic';

const SETTINGS_ID = 'repair_task_admin_settings';

async function readSettings() {
  const dbi = await db.connect();
  return dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { pricing: 1 } });
}

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const settings = await readSettings();
  return NextResponse.json({
    tiers: tiersFromSettings(settings),
    defaults: DEFAULT_QUANTITY_TIERS,
    // The shop's real pricing settings, so the card prices its preview through THE engine
    // (services/pricing/engine.js). This used to send `businessMultiplier || 2` — a field that is never
    // stored, so the preview always showed the fallback — and `wholesaleMarkup || 1.2`.
    pricing: settings?.pricing || null,
  });
}

export async function PUT(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const tiers = normalizeQuantityTiers(body?.tiers);

  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        'pricing.quantityTiers': tiers,
        'pricing.quantityTiersUpdatedAt': now,
        'pricing.quantityTiersUpdatedBy': session.user.email || session.user.userID || '',
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ tiers });
}
