import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { shipFromFromSettings, addressProblems } from '@/services/shipping/addresses';
import { resolveParcelPresets } from '@/services/shipping/parcels';
import { isEasyPostConfigured, easyPostMode } from '@/services/shipping/easypost';

const SETTINGS_ID = 'repair_task_admin_settings';
const ADDRESS_KEYS = ['name', 'company', 'street1', 'street2', 'city', 'state', 'zip', 'country', 'phone', 'email'];

/**
 * GET/PUT /api/admin/settings/shipping — the shop's ship-from address + parcel presets
 * (`business.shipFrom`, `business.shipping.parcels`). Admin/dev only. Separate from the PIN-gated
 * pricing PUT on purpose: an address is not a money setting, and the PIN flow is what stopped
 * anything non-numeric from living in Store Settings until now. Dot-path $set so the rest of
 * `business` is untouched (subdoc writes replace, not merge).
 */
export const GET = async () => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const dbi = await db.connect();
  const settings = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { business: 1 } });
  const shipFrom = shipFromFromSettings(settings || {});
  return NextResponse.json({
    shipFrom,
    shipFromProblems: addressProblems(shipFrom, 'ship-from'),
    parcels: resolveParcelPresets(settings || {}),
    easypost: { configured: isEasyPostConfigured(), mode: easyPostMode() },
  });
};

export const PUT = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;
    const body = await req.json().catch(() => ({}));
    const $set = { updatedAt: new Date(), lastModifiedBy: session.user.email || session.user.userID };
    if (body.shipFrom && typeof body.shipFrom === 'object') {
      for (const key of ADDRESS_KEYS) $set[`business.shipFrom.${key}`] = String(body.shipFrom[key] ?? '').trim();
    }
    if (Array.isArray(body.parcels)) {
      const parcels = body.parcels
        .filter((p) => p && p.key && Number(p.weightOz) > 0)
        .map((p) => ({
          key: String(p.key).trim(), label: String(p.label || p.key).trim(), weightOz: Number(p.weightOz),
          ...(p.predefinedPackage ? { predefinedPackage: String(p.predefinedPackage).trim() } : { length: Number(p.length), width: Number(p.width), height: Number(p.height) }),
        }));
      $set['business.shipping.parcels'] = parcels;
    }
    const dbi = await db.connect();
    await dbi.collection('adminSettings').updateOne({ _id: SETTINGS_ID }, { $set });
    const settings = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { business: 1 } });
    const shipFrom = shipFromFromSettings(settings || {});
    return NextResponse.json({ success: true, shipFrom, shipFromProblems: addressProblems(shipFrom, 'ship-from'), parcels: resolveParcelPresets(settings || {}) });
  } catch (error) {
    console.error('Error saving shipping settings:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
