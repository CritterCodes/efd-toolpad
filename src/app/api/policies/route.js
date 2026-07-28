import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/apiAuth';
import { POLICIES, publicPolicy, needsAcceptance } from '@/services/policies/policyRegistry';

/**
 * GET /api/policies — the current policy docs + whether the signed-in user still needs to accept
 * each (never accepted, or accepted an older version). Powers the in-app policy page + the gate.
 */
export const GET = async () => {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const dbInstance = await db.connect();
  const user = await dbInstance.collection('users').findOne({ userID: session.user.userID }, { projection: { agreements: 1 } });
  const policies = Object.keys(POLICIES).map((docId) => ({
    ...publicPolicy(docId),
    needsAcceptance: needsAcceptance(user || {}, docId),
    acceptedVersion: (user?.agreements || []).find((a) => a.docId === docId)?.version ?? null,
  }));
  return NextResponse.json({ policies }, { status: 200 });
};
