/**
 * User Approval API Endpoint
 * Handles approval/rejection of pending users
 */

import { UnifiedUserService } from '../../../../lib/unifiedUserService.js';
import { checkAPIPermissions } from '../../../../lib/authHelpers.js';

export async function POST(request) {
  try {
    const authCheck = await checkAPIPermissions(request, ['userManagement']);
    
    if (!authCheck.success) {
      return new Response(
        JSON.stringify({ error: authCheck.error }),
        { status: authCheck.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminUser = authCheck.user;
    const { action, userID, reason, notes } = await request.json();

    if (!action || !userID) {
      return new Response(
        JSON.stringify({ error: 'Action and userID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let result;
    
    if (action === 'approve') {
      result = await UnifiedUserService.approveUser(userID, adminUser.userID, notes);
    } else if (action === 'reject') {
      if (!reason) {
        return new Response(
          JSON.stringify({ error: 'Rejection reason is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      result = await UnifiedUserService.rejectUser(userID, adminUser.userID, reason);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "approve" or "reject"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${action}d successfully`,
        user: result 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('User approval API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  try {
    const authCheck = await checkAPIPermissions(request, ['userManagement']);
    
    if (!authCheck.success) {
      return new Response(
        JSON.stringify({ error: authCheck.error }),
        { status: authCheck.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pendingUsers = await UnifiedUserService.getPendingUsers();

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: pendingUsers 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get pending users API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}