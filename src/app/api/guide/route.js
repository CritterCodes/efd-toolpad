/**
 * GET  /api/guide — "How EFD works" for the signed-in user: every pay rate/fee from LIVE settings
 *                   (services/guide/guideTerms) + their first-steps checklist with done flags.
 * POST /api/guide — { read: true } marks the guide as read (users.guide.readAt) for the checklist.
 *
 * Any signed-in dashboard user may read this — the point is transparency. Nothing here is a secret:
 * the same numbers already price every ticket and every payout the user can see.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { readFeeSettings, FEE_DEFAULTS } from '@/services/payroll/payoutCadence';
import { qcModeFromSettings } from '@/services/repairs/qcMode';
import { isConnectLive } from '@/services/payroll/connectPayouts';
import { isStripeConfigured } from '@/lib/stripeConnect';
import { needsAcceptance } from '@/services/policies/policyRegistry';
import { buildGuideTerms, buildChecklist, profileIsComplete } from '@/services/guide/guideTerms';

export const dynamic = 'force-dynamic';

const USER_PROJECTION = { _id: 0, userID: 1, role: 1, image: 1, agreements: 1, artisanApplication: 1, stripeConnect: 1, fulfillmentPreference: 1, business: 1, wholesaleApplication: 1, guide: 1 };

export async function GET() {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const role = session.user.role;
  const userID = session.user.userID;
  try {
    const dbi = await db.connect();
    const [settings, fees, user, affiliate] = await Promise.all([
      SettingsManagerService.getSettings().catch(() => ({})),
      readFeeSettings().catch(() => FEE_DEFAULTS),
      dbi.collection('users').findOne({ userID }, { projection: USER_PROJECTION }),
      dbi.collection('affiliates').findOne({ userId: userID }, { projection: { _id: 0, code: 1, commissionRate: 1, status: 1 } }),
    ]);

    const facts = {
      termsAccepted: !needsAcceptance(user || {}, 'artisan-terms'),
      profileComplete: profileIsComplete(user || {}),
      connectLive: isConnectLive(user),
      connectStarted: Boolean(user?.stripeConnect?.accountId),
      guideRead: Boolean(user?.guide?.readAt),
      affiliateCode: affiliate?.code || '',
    };
    if (role === 'wholesaler') {
      facts.storeSettingsComplete = Boolean((user?.business || user?.wholesaleApplication?.businessName) && user?.fulfillmentPreference?.method);
      facts.storeRepairsCount = await dbi.collection('repairs').countDocuments({ userID });
    }
    if (role === 'admin' || role === 'dev') {
      facts.stripeConfigured = isStripeConfigured();
      facts.qcModeSet = Boolean(settings?.business?.qc?.mode);
      facts.payoutFeesSet = Boolean(settings?.payoutFees);
      facts.fundingSet = Boolean(settings?.payrollFunding);
    }

    const terms = buildGuideTerms({ settings, fees, qcMode: qcModeFromSettings(settings), affiliate });
    const checklist = buildChecklist({ role, facts });
    return NextResponse.json({
      role,
      artisanTypes: session.user.artisanTypes || [],
      terms,
      checklist,
      complete: checklist.every((i) => i.done),
      affiliate: affiliate ? { code: affiliate.code || '', status: affiliate.status || '' } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not load the guide.' }, { status: 500 });
  }
}

export async function POST(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  if (body?.read !== true) return NextResponse.json({ error: 'Nothing to do.' }, { status: 400 });
  const dbi = await db.connect();
  await dbi.collection('users').updateOne({ userID: session.user.userID }, { $set: { 'guide.readAt': new Date() } });
  return NextResponse.json({ ok: true });
}
