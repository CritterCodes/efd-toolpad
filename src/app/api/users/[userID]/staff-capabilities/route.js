import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { normalizeCapabilities } from '../../staffCapabilityRules';
import { userIdentityQuery } from '../../model';

/**
 * PATCH /api/users/[userID]/staff-capabilities — the ONLY way to grant or revoke repair capabilities.
 *
 * Why a dedicated route: `staffCapabilities` is in USER_PRIVILEGE_FIELDS, so the generic
 * `PUT /api/users/[userID]` strips it unconditionally (see users/model.js stripPrivilegeFields). That
 * strip closed a real escalation — the generic route once let a caller hand themselves capabilities —
 * but it also left the admin capability switches with nowhere to write. They silently no-op'd: the save
 * returned 200, the UI said "saved", and the refetch snapped every switch back. There was no working
 * path to promote a jeweler to QC at all.
 *
 * Same shape as the other privileged-field escape hatches in this codebase (`create-admin` for `role`,
 * `repairs/payroll/owner-operators` for `isOwnerOperator`): narrow route, explicit role gate, whitelist.
 */

export const PATCH = async (req, { params }) => {
  try {
    // Admin/dev only. Granting capabilities is granting access to money and other people's work —
    // this is deliberately narrower than the STAFF_ROLES gate on the generic user route.
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { userID } = await params;
    if (!userID) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body || typeof body.staffCapabilities !== 'object' || body.staffCapabilities === null || Array.isArray(body.staffCapabilities)) {
      return NextResponse.json({ error: 'staffCapabilities object is required.' }, { status: 400 });
    }

    let staffCapabilities;
    try {
      staffCapabilities = normalizeCapabilities(body.staffCapabilities);
    } catch (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const dbInstance = await db.connect();
    // userIdentityQuery, NOT a bare { userID }: the artisan list navigates by Mongo `_id`
    // (ArtisanTable.js pushes `artisan._id`), so the route param is a 24-hex ObjectId, which is never
    // a valid `userID` value. Matching on the field alone 404'd every real call. The GET and the
    // generic PUT on this same page work precisely because they go through this helper.
    const result = await dbInstance.collection('users').updateOne(
      userIdentityQuery(userID),
      { $set: { staffCapabilities, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // The session bakes staffCapabilities at login (api/auth/[...nextauth]/service.js), so a change
    // here does not reach an already-signed-in jeweler until their next sign-in. Surfaced in the
    // response so the UI can say so rather than implying it took effect immediately.
    return NextResponse.json({ staffCapabilities, appliesOnNextLogin: true }, { status: 200 });
  } catch (error) {
    console.error('Error in staff-capabilities PATCH route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
