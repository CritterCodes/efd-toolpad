import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

// GET /api/affiliates — admin only, paginated list
export async function GET(request) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
  const skip = (page - 1) * limit;
  const status = searchParams.get('status');

  const query = {};
  if (status) query.status = status;

  const col = await db.dbAffiliates();
  const [affiliates, total] = await Promise.all([
    col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(query),
  ]);

  return NextResponse.json({
    success: true,
    data: affiliates,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/affiliates — admin only, create affiliate profile
export async function POST(request) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { userId, code, commissionRate = 0.1, commissionType = 'percentage', name, email } = body;

  if (!userId || !code) {
    return NextResponse.json({ success: false, error: 'userId and code are required.' }, { status: 400 });
  }

  const col = await db.dbAffiliates();

  const existing = await col.findOne({ code });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Affiliate code already taken.' }, { status: 409 });
  }

  const now = new Date();
  const affiliate = {
    affiliateId: `aff_${uuidv4().slice(-8)}`,
    code: code.toLowerCase().trim(),
    userId,
    name: name || '',
    email: email || '',
    status: 'active',
    commissionType,
    commissionRate,
    attributionWindowDays: 90,
    promotedBy: session.user.userID || session.user.email,
    promotedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(affiliate);

  return NextResponse.json({ success: true, data: affiliate }, { status: 201 });
}
