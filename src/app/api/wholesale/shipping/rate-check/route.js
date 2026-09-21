import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireRepairOpsAny } from '@/lib/apiAuth';
import { quoteShipment, isEasyPostConfigured, easyPostMode } from '@/services/shipping/easypost';
import { loadShipFrom, shipToFromWholesaler, addressProblems } from '@/services/shipping/addresses';
import { findParcelPreset, parcelForEasyPost, resolveParcelPresets } from '@/services/shipping/parcels';

/**
 * GET  /api/wholesale/shipping/rate-check                      → stores + parcel presets + readiness
 * POST /api/wholesale/shipping/rate-check { wholesalerId, parcelKey } → live FedEx rates, NOT stored
 *
 * An ad-hoc rate check for the Shipping & Delivery desk (owner, 2026-09-21: "can you get me a
 * quote for a large box to Marlen?"). Nothing is bought and nothing is written — a quote for a
 * real invoice still happens at Finalize, where it lands on the bill.
 */
export const GET = async () => {
  const { errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
  if (errorResponse) return errorResponse;
  const dbi = await db.connect();
  const [{ settings, shipFrom }, wholesalers] = await Promise.all([
    loadShipFrom(),
    dbi.collection('users').find({ role: 'wholesaler', status: { $ne: 'terminated' } }, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, business: 1, wholesaleApplication: 1 } }).toArray(),
  ]);
  const stores = wholesalers.map((u) => {
    const shipTo = shipToFromWholesaler(u);
    return { userID: u.userID, name: shipTo.company || shipTo.name, city: shipTo.city, state: shipTo.state, addressProblems: addressProblems(shipTo, 'address') };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({
    configured: isEasyPostConfigured(), mode: easyPostMode(),
    shipFromProblems: addressProblems(shipFrom, 'Shop ship-from address'),
    parcels: resolveParcelPresets(settings),
    stores,
  });
};

export const POST = async (req) => {
  try {
    const { errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
    if (errorResponse) return errorResponse;
    const body = await req.json().catch(() => ({}));
    if (!body?.wholesalerId) return NextResponse.json({ error: 'wholesalerId is required.' }, { status: 400 });
    const dbi = await db.connect();
    const user = await dbi.collection('users').findOne({ userID: String(body.wholesalerId), role: 'wholesaler' }, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, business: 1, email: 1, phoneNumber: 1, address: 1, wholesaleApplication: 1 } });
    if (!user) return NextResponse.json({ error: 'Wholesale account not found.' }, { status: 404 });
    const { settings, shipFrom } = await loadShipFrom();
    const shipTo = shipToFromWholesaler(user);
    const problems = [
      ...(isEasyPostConfigured() ? [] : ['EasyPost is not configured (EASYPOST_API_KEY).']),
      ...addressProblems(shipFrom, 'Shop ship-from address'),
      ...addressProblems(shipTo, `${shipTo.company || 'store'} address`),
    ];
    if (problems.length) return NextResponse.json({ error: problems.join(' ') }, { status: 400 });
    const preset = findParcelPreset(settings, body.parcelKey || '');
    const quote = await quoteShipment({ shipFrom, shipTo, parcel: parcelForEasyPost(preset), carriers: ['FedEx'], reference: `rate-check:${user.userID}`, options: body.saturdayDelivery === true ? { saturday_delivery: true } : null });
    return NextResponse.json({ ...quote, parcelKey: preset.key, parcelLabel: preset.label, shipTo }, { status: 200 });
  } catch (error) {
    const status = error.name === 'EasyPostError' ? 502 : 500;
    if (status === 500) console.error('rate-check failed:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
