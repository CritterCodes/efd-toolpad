// /api/users/[userID]/route.js
// API endpoint for individual user operations

import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';
import { stripPrivilegeFields } from '../model';
import UserService from '../service.js';

/**
 * Individual user operations. `middleware.js` skips `/api/*`, so these handlers own their auth.
 *
 * UNTIL THIS EXISTED, PUT WAS UNAUTHENTICATED PRIVILEGE ESCALATION TO ADMIN. It stripped only
 * `_id`, `userID` and `createdAt` before a raw `$set`, so ANY anonymous caller could
 * `PUT /api/users/<anyone> {"role":"admin"}` and mint themselves (or anyone) a full admin — which also
 * defeated every other role gate in the app, since the escalated account then passes them honestly.
 * GET leaked any user's record and DELETE removed accounts, both unauthenticated.
 *
 * Role changes do NOT belong on this generic endpoint: `role` is stripped even for staff, because
 * granting admin has its own guarded path (`/api/users/create-admin`, which additionally checks
 * adminSettings) and `promote-affiliate` has its own. A blanket `$set` must not be a way around them.
 */


export async function GET(request, { params }) {
  // Any signed-in user may read a user record (the dashboard shows artisan/client detail pages);
  // narrowing this to self-or-staff needs the access matrix that's still open — but anonymous is out.
  const { errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  try {
    const { userID } = await params;

    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await UserService.getUserById(userID);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: user 
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  // Staff only: the legitimate callers are the admin user-management and artisan-detail pages, and the
  // payload includes compensationProfile/employment — pay data.
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { userID } = await params;
    const updateData = await request.json();

    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    const { _id, userID: userId, createdAt, ...rest } = updateData;
    // PRIVILEGE FIELDS ARE STRIPPED even for staff — see the file header. Shared with the `?query=`
    // sibling via stripPrivilegeFields so the two can't drift (they did: this one stripped and that one
    // didn't, leaving a staff→admin self-promotion open). Also handles dotted keys, which an exact-key
    // delete misses. The admin pages re-send the record they just fetched, so dropping an unchanged
    // `role` is a no-op for every real caller.
    const safeUpdateData = stripPrivilegeFields(rest);

    // Add updatedAt timestamp
    safeUpdateData.updatedAt = new Date();

    const updatedUser = await UserService.updateUserById(userID, safeUpdateData);
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    const { userID } = await params;

    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await UserService.deleteUser(userID);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User not found or deletion failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}