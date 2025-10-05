/**
 * Role Permissions API Endpoint
 * Provides role and permission information
 */

import { UnifiedUserService, USER_ROLES, ROLE_PERMISSIONS } from '../../../lib/unifiedUserService.js';
import { checkAPIPermissions, authenticateAPIRequest } from '../../../lib/authHelpers.js';

export async function GET(request) {
  try {
    // Authenticate user using helper
    const user = await authenticateAPIRequest(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'current-user') {
      // Return current user's information
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
      const hasPermission = await checkAPIPermissions(request, ['MANAGE_USERS']);
      if (!hasPermission) {
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
    // Authenticate user using helper
    const user = await authenticateAPIRequest(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to update roles
    const hasPermission = await checkAPIPermissions(request, ['MANAGE_USERS']);
    if (!hasPermission) {
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

    const userService = new UnifiedUserService();
    const updatedUser = await userService.updateUserRole(userID, newRole, user.userID);

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