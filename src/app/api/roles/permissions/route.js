/**
 * Role Permissions API Endpoint
 * Provides role and permission information
 */

import { UnifiedUserService, USER_ROLES, ROLE_PERMISSIONS } from '../../../lib/unifiedUserService.js';
import { auth } from '../../../../../auth.js';

export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'current-user') {
      // Get current user's permissions
      const user = await UnifiedUserService.findUserByEmail(session.user.email);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          user: {
            userID: user.userID,
            email: user.email,
            role: user.role,
            status: user.status,
            permissions: user.permissions
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'all-roles') {
      // Check if user has permission to view role information
      const adminUser = await UnifiedUserService.findUserByEmail(session.user.email);
      if (!adminUser || !UnifiedUserService.hasPermission(adminUser, 'userManagement')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          roles: USER_ROLES,
          permissions: ROLE_PERMISSIONS
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Default: return basic role information
    return new Response(
      JSON.stringify({ 
        success: true,
        roles: Object.values(USER_ROLES),
        userRoles: USER_ROLES
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Role permissions API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to update roles
    const adminUser = await UnifiedUserService.findUserByEmail(session.user.email);
    if (!adminUser || !UnifiedUserService.hasPermission(adminUser, 'userManagement')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userID, newRole } = await request.json();

    if (!userID || !newRole) {
      return new Response(
        JSON.stringify({ error: 'UserID and newRole are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Object.values(USER_ROLES).includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedUser = await UnifiedUserService.updateUserRole(userID, newRole, adminUser.userID);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User role updated successfully',
        user: updatedUser
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update role API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}