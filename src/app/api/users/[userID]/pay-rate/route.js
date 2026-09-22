import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { userIdentityQuery } from '../../model';
import { readLadder, tierByKey, resolvePayRate } from '@/services/pay/payLadder';

/**
 * PATCH /api/users/[userID]/pay-rate  { payTier?: string, hourlyRate?: number|null }
 *
 * The ONLY writer of `employment.payTier` and `employment.hourlyRate` (both are privileged subpaths, so
 * the generic user PUT strips them — same shape as staff-capabilities and owner-operators). Money
 * follows this field at every QC pass, so it is admin/dev only.
 *
 *   payTier + no hourlyRate  → placed on the tier at the tier's rate
 *   payTier + hourlyRate     → placed on the tier with a negotiated override
 *   hourlyRate only          → custom rate, no tier
 *   payTier '' + hourlyRate null → back to the shop rate (pre-ladder behavior)
 *
 * Takes effect at the next sign-off (labor logs snapshot the rate); history is never repriced.
 */
export const PATCH = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { userID } = await params;
    if (!userID) return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const ladder = await readLadder();
    const payTier = body?.payTier === undefined ? undefined : String(body.payTier || '').trim();
    if (payTier && !tierByKey(ladder, payTier)) {
      return NextResponse.json({ error: `Unknown tier "${payTier}".` }, { status: 400 });
    }
    let hourlyRate;
    if (body?.hourlyRate !== undefined) {
      if (body.hourlyRate === null || body.hourlyRate === '') hourlyRate = null;
      else {
        hourlyRate = Math.round(Number(body.hourlyRate) * 100) / 100;
        if (!(hourlyRate > 0) || hourlyRate > 500) return NextResponse.json({ error: 'hourlyRate must be between 0 and 500.' }, { status: 400 });
      }
    }
    if (payTier === undefined && hourlyRate === undefined) {
      return NextResponse.json({ error: 'payTier or hourlyRate is required.' }, { status: 400 });
    }
    // Placing on a tier without an explicit rate sets the rate to the tier's — the stored rate is what
    // the credit reads, and it must never lag a tier change silently.
    if (payTier && hourlyRate === undefined) hourlyRate = tierByKey(ladder, payTier).rate;

    const $set = { updatedAt: new Date(), 'employment.payRateUpdatedAt': new Date() };
    if (payTier !== undefined) $set['employment.payTier'] = payTier;
    if (hourlyRate !== undefined) $set['employment.hourlyRate'] = hourlyRate;

    const dbi = await db.connect();
    const result = await dbi.collection('users').findOneAndUpdate(
      userIdentityQuery(userID),
      { $set },
      { returnDocument: 'after', projection: { _id: 0, userID: 1, employment: 1 } },
    );
    const user = result?.value ?? result;
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const shopWage = Number((await dbi.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' }, { projection: { 'pricing.wage': 1 } }))?.pricing?.wage) || 0;
    return NextResponse.json({ employment: user.employment || {}, payRate: resolvePayRate(user, ladder, shopWage), appliesAtNextSignOff: true });
  } catch (error) {
    console.error('Error in pay-rate PATCH route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
