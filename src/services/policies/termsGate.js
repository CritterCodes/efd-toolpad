/**
 * Terms acceptance GATE (owner, 2026-09-22). policyRegistry computed `needsAcceptance` but nothing
 * enforced it — the badge on /dashboard/policies was the whole experience. ARTISAN_TERMS §12: accept at
 * onboarding, re-accept on a version bump. So the money-facing artisan actions now refuse until the
 * current version is accepted:
 *
 *   claiming a work order · signing off / moving to QC on My Bench · creating a design, a run or a
 *   listing edit · starting Stripe payout onboarding
 *
 * Reads only (pages, payroll history, the guide) are never gated. Only role `artisan` is gated —
 * admin/dev are exempt, and the other roles have no artisan terms to accept. The terms are still a
 * draft (not legally reviewed); gating a draft is the owner's explicit call, and the page says so.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { userIdentityQuery } from '@/app/api/users/model';
import { needsAcceptance, currentVersion } from '@/services/policies/policyRegistry';

export const TERMS_DOC_ID = 'artisan-terms';
export const TERMS_ERROR_CODE = 'TERMS_REQUIRED';
export const TERMS_PAGE_PATH = '/dashboard/policies';

/** Pure: which roles the artisan terms apply to. */
export function isTermsGatedRole(role) {
  return role === 'artisan';
}

/** Pure: the refusal everyone sees, with the way out named. */
export function termsRequiredMessage(user = {}) {
  const accepted = (user?.agreements || []).find((a) => a && a.docId === TERMS_DOC_ID);
  const v = currentVersion(TERMS_DOC_ID);
  return accepted
    ? `The artisan terms were updated (v${v}). Accept the new version under Terms before starting new work.`
    : 'Accept the artisan terms under Terms before starting new work. It takes a minute and you only do it once per version.';
}

/** Pure: does THIS user (doc with agreements) need to accept? Non-artisans never do. */
export function userNeedsTerms(user = {}, role = user?.role) {
  if (!isTermsGatedRole(role)) return false;
  return needsAcceptance(user || {}, TERMS_DOC_ID);
}

/** Load the session's agreements and decide. Admin/dev/other roles short-circuit without a read. */
export async function sessionNeedsTerms(session) {
  const role = session?.user?.role;
  if (!isTermsGatedRole(role)) return { needs: false, user: null };
  const dbi = await db.connect();
  const user = await dbi.collection('users').findOne(userIdentityQuery(session.user.userID), { projection: { _id: 0, userID: 1, role: 1, agreements: 1 } });
  return { needs: userNeedsTerms(user || {}, role), user: user || {} };
}

/** Service-layer gate: throws an Error with code TERMS_REQUIRED (bench route maps it to 403). */
export async function assertTermsAccepted(session) {
  const { needs, user } = await sessionNeedsTerms(session);
  if (!needs) return;
  const e = new Error(termsRequiredMessage(user));
  e.code = TERMS_ERROR_CODE;
  e.policyUrl = TERMS_PAGE_PATH;
  throw e;
}

/** Route-layer gate: a 403 NextResponse to return, or null to proceed. */
export async function termsGateResponse(session) {
  const { needs, user } = await sessionNeedsTerms(session);
  if (!needs) return null;
  return NextResponse.json({ error: termsRequiredMessage(user), code: TERMS_ERROR_CODE, policyUrl: TERMS_PAGE_PATH }, { status: 403 });
}
