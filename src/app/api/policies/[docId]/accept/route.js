import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/apiAuth';
import { currentVersion, applyAcceptance } from '@/services/policies/policyRegistry';

/**
 * POST /api/policies/[docId]/accept — record the signed-in user's acceptance of the doc's CURRENT
 * version on `users.agreements[]`. Idempotent (replaces any prior acceptance of the same doc).
 * Body may pass `{ version }` to assert the version the client displayed; it must match current.
 */
export const POST = async (req, { params }) => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const { docId } = await params;
  const version = currentVersion(docId);
  if (!version) return NextResponse.json({ error: 'Unknown policy document.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.version && body.version !== version) {
    return NextResponse.json({ error: 'Policy has changed — reload and review the current version.', currentVersion: version }, { status: 409 });
  }

  const dbInstance = await db.connect();
  const user = await dbInstance.collection('users').findOne({ userID: session.user.userID }, { projection: { agreements: 1 } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const agreements = applyAcceptance(user.agreements || [], docId, version, new Date());
  await dbInstance.collection('users').updateOne({ userID: session.user.userID }, { $set: { agreements, updatedAt: new Date() } });
  return NextResponse.json({ docId, version, accepted: true }, { status: 200 });
};
