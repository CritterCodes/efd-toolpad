import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

function generateCode(user, suffix) {
  const base = `${user.firstName || ''}${user.lastName || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return base ? `${base}-${suffix}` : suffix;
}

// POST /api/users/[userID]/promote-affiliate
export async function POST(request, { params }) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { userID } = await params;
  const body = await request.json();
  const { commissionRate = 0.1, commissionType = 'percentage' } = body;

  const usersCol = await db.dbUsers();
  const user = await usersCol.findOne({ userID });
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
  }

  if (user.role === 'affiliate') {
    return NextResponse.json({ success: false, error: 'User is already an affiliate.' }, { status: 409 });
  }

  const affiliatesCol = await db.dbAffiliates();
  const suffix = uuidv4().slice(-5);
  const code = generateCode(user, suffix);

  const now = new Date();
  const affiliateId = `aff_${uuidv4().slice(-8)}`;

  await usersCol.updateOne({ userID }, { $set: { role: 'affiliate', updatedAt: now } });

  const affiliate = {
    affiliateId,
    code,
    codeSetByAffiliate: false,
    userId: userID,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.email || '',
    status: 'active',
    commissionType,
    commissionRate,
    attributionWindowDays: 90,
    promotedBy: session.user.userID || session.user.email,
    promotedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await affiliatesCol.insertOne(affiliate);

  return NextResponse.json({ success: true, data: affiliate }, { status: 201 });
}
