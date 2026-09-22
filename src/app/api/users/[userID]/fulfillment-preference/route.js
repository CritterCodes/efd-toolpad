/**
 * GET/PATCH /api/users/[userID]/fulfillment-preference — how this wholesale store gets its
 * finished work back (services/shipping/storeFulfillment.js). Admin/dev only.
 *   PATCH { method: 'pickup' | 'delivery' | 'ship', parcelKey? }   or   { method: null } to clear.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { userIdentityQuery } from '../../model';
import { normalizeFulfillmentPreference, FULFILLMENT_PREFERENCES } from '@/services/shipping/storeFulfillment';

export async function GET(_req, { params }) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { userID } = await params;
  const dbi = await db.connect();
  const user = await dbi.collection('users').findOne(userIdentityQuery(userID), { projection: { _id: 0, userID: 1, role: 1, fulfillmentPreference: 1 } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ userID: user.userID, preference: normalizeFulfillmentPreference(user.fulfillmentPreference), options: FULFILLMENT_PREFERENCES });
}

export async function PATCH(req, { params }) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const { userID } = await params;
  const body = await req.json().catch(() => ({}));
  const dbi = await db.connect();
  const user = await dbi.collection('users').findOne(userIdentityQuery(userID), { projection: { _id: 0, userID: 1, role: 1 } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role !== 'wholesaler') return NextResponse.json({ error: 'Fulfillment preferences apply to wholesale stores only.' }, { status: 400 });

  const now = new Date();
  const actor = session.user.email || session.user.userID;
  if (body?.method === null) {
    await dbi.collection('users').updateOne({ userID: user.userID }, { $unset: { fulfillmentPreference: '' }, $set: { updatedAt: now } });
    return NextResponse.json({ userID: user.userID, preference: null });
  }
  const pref = normalizeFulfillmentPreference(body);
  if (!pref) return NextResponse.json({ error: `method must be one of ${FULFILLMENT_PREFERENCES.join(', ')}` }, { status: 400 });
  await dbi.collection('users').updateOne(
    { userID: user.userID },
    { $set: { fulfillmentPreference: { ...pref, updatedAt: now, updatedBy: actor }, updatedAt: now } },
  );
  return NextResponse.json({ userID: user.userID, preference: pref });
}
