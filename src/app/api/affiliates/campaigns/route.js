import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

// GET /api/affiliates/campaigns?affiliateId= — affiliate owner or admin
export async function GET(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const affiliateId = searchParams.get('affiliateId');

  const query = {};
  if (affiliateId) {
    query.affiliateId = affiliateId;
  } else if (!isAdminOrDev(session.user.role)) {
    // Non-admins must filter by affiliateId
    const affiliatesCol = await db.dbAffiliates();
    const affiliate = await affiliatesCol.findOne({ userId: session.user.userID });
    if (!affiliate) return NextResponse.json({ success: true, data: [] });
    query.affiliateId = affiliate.affiliateId;
  }

  const col = await db.dbAffiliateCampaigns();
  const campaigns = await col.find(query).sort({ createdAt: -1 }).toArray();

  return NextResponse.json({ success: true, data: campaigns });
}

// POST /api/affiliates/campaigns — affiliate or admin creates a campaign
export async function POST(request) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { affiliateId, name, description, destinationUrl, code } = body;

  if (!affiliateId || !name) {
    return NextResponse.json({ success: false, error: 'affiliateId and name are required.' }, { status: 400 });
  }

  // Verify requester owns the affiliate or is admin
  const affiliatesCol = await db.dbAffiliates();
  const affiliate = await affiliatesCol.findOne({ affiliateId });
  if (!affiliate) {
    return NextResponse.json({ success: false, error: 'Affiliate not found.' }, { status: 404 });
  }
  if (!isAdminOrDev(session.user.role) && affiliate.userId !== session.user.userID) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  const campaignCode = (code || name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const col = await db.dbAffiliateCampaigns();

  const conflict = await col.findOne({ affiliateId, code: campaignCode });
  if (conflict) {
    return NextResponse.json({ success: false, error: 'Campaign code already exists for this affiliate.' }, { status: 409 });
  }

  const now = new Date();
  const campaign = {
    campaignId: `camp_${uuidv4().slice(-8)}`,
    affiliateId,
    affiliateCode: affiliate.code,
    code: campaignCode,
    name,
    description: description || '',
    status: 'active',
    destinationUrl: destinationUrl || '/custom-work/request',
    createdBy: session.user.userID || session.user.email,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(campaign);

  return NextResponse.json({ success: true, data: campaign }, { status: 201 });
}
