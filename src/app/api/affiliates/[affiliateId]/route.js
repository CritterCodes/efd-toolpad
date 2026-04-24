import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';

function isAdminOrDev(role) {
  return role === 'admin' || role === 'dev';
}

// GET /api/affiliates/[affiliateId] — admin/dev or the affiliate themselves
export async function GET(request, { params }) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { affiliateId } = await params;
  const col = await db.dbAffiliates();
  const affiliate = await col.findOne({ affiliateId });

  if (!affiliate) {
    return NextResponse.json({ success: false, error: 'Affiliate not found.' }, { status: 404 });
  }

  if (!isAdminOrDev(session.user.role) && affiliate.userId !== session.user.userID) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: affiliate });
}

// PATCH /api/affiliates/[affiliateId] — admin/dev can update any field; affiliate can update their own code
export async function PATCH(request, { params }) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { affiliateId } = await params;
  const body = await request.json();

  const col = await db.dbAffiliates();
  const affiliate = await col.findOne({ affiliateId });
  if (!affiliate) {
    return NextResponse.json({ success: false, error: 'Affiliate not found.' }, { status: 404 });
  }

  const isSelf = affiliate.userId === session.user.userID;
  const isPrivileged = isAdminOrDev(session.user.role);

  if (!isSelf && !isPrivileged) {
    return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
  }

  // Affiliates can only update their own code; admins can update all fields
  const adminFields = ['status', 'commissionRate', 'commissionType', 'attributionWindowDays', 'name', 'email'];
  const selfFields = ['code', 'codeSetByAffiliate'];
  const allowed = isPrivileged ? [...adminFields, ...selfFields] : selfFields;
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ success: false, error: 'No valid fields to update.' }, { status: 400 });
  }

  if (updates.code) {
    updates.code = updates.code.toLowerCase().trim();
    const conflict = await col.findOne({ code: updates.code, affiliateId: { $ne: affiliateId } });
    if (conflict) {
      return NextResponse.json({ success: false, error: 'Affiliate code already taken.' }, { status: 409 });
    }
  }

  updates.updatedAt = new Date();

  const result = await col.findOneAndUpdate(
    { affiliateId },
    { $set: updates },
    { returnDocument: 'after' }
  );

  if (!result) {
    return NextResponse.json({ success: false, error: 'Affiliate not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}
