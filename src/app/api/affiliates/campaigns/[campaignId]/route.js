import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

async function resolveCampaignWithAccess(campaignId, session) {
  const col = await db.dbAffiliateCampaigns();
  const campaign = await col.findOne({ campaignId });
  if (!campaign) return { campaign: null, error: 'Campaign not found.', status: 404 };

  if (!isAdminOrDev(session.user.role)) {
    const affiliatesCol = await db.dbAffiliates();
    const affiliate = await affiliatesCol.findOne({ affiliateId: campaign.affiliateId });
    if (!affiliate || affiliate.userId !== session.user.userID) {
      return { campaign: null, error: 'Access denied.', status: 403 };
    }
  }

  return { campaign, col };
}

// GET /api/affiliates/campaigns/[campaignId]
export async function GET(request, { params }) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { campaignId } = await params;
  const { campaign, error, status } = await resolveCampaignWithAccess(campaignId, session);
  if (error) return NextResponse.json({ success: false, error }, { status });

  // Attach basic click/conversion counts
  const eventsCol = await db.dbAffiliateReferralEvents();
  const [clicks, conversions] = await Promise.all([
    eventsCol.countDocuments({ campaignId }),
    eventsCol.countDocuments({ campaignId, converted: true }),
  ]);

  return NextResponse.json({ success: true, data: { ...campaign, metrics: { clicks, conversions } } });
}

// PATCH /api/affiliates/campaigns/[campaignId]
export async function PATCH(request, { params }) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { campaignId } = await params;
  const { campaign, col, error, status } = await resolveCampaignWithAccess(campaignId, session);
  if (error) return NextResponse.json({ success: false, error }, { status });

  const body = await request.json();
  const allowed = ['name', 'description', 'destinationUrl', 'status'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ success: false, error: 'No valid fields to update.' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const result = await col.findOneAndUpdate({ campaignId }, { $set: updates }, { returnDocument: 'after' });

  return NextResponse.json({ success: true, data: result });
}
