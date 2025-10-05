/**
 * Server-side permission checking utilities
 * Used in pages and API routes to validate user permissions
 */

import { auth } from '../../auth.js';
import { UnifiedUserService } from './unifiedUserService.js';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user with full permission data
 */
export async function getCurrentUser() {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return null;
    }

    // Get full user data from database
    const user = await UnifiedUserService.findUserByEmail(session.user.email);
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - redirect to signin if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return user;
}

/**
 * Require specific role - redirect or throw error if insufficient permissions
 */
export async function requireRole(allowedRoles, redirectTo = '/dashboard') {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }
  
  return user;
}

/**
 * Require specific permission - redirect or throw error if insufficient permissions
 */
export async function requirePermission(permission, redirectTo = '/dashboard') {
  const user = await requireAuth();
  
  if (!UnifiedUserService.hasPermission(user, permission)) {
    redirect(redirectTo);
  }
  
  return user;
}

/**
 * Require admin access to efd-admin
 */
export async function requireAdminAccess() {
  const user = await requireAuth();
  
  if (!UnifiedUserService.canAccessEfdAdmin(user)) {
    throw new Error('Access Denied: Insufficient permissions for admin panel');
  }
  
  return user;
}

/**
 * Check if user account is pending approval
 */
export async function checkPendingStatus() {
  const user = await requireAuth();
  
  if (user.status === 'pending') {
    redirect('/dashboard/pending');
  }
  
  if (user.status === 'suspended' || user.status === 'rejected') {
    throw new Error('Account suspended or rejected');
  }
  
  return user;
}

/**
 * Complete permission check for admin routes
 */
export async function requireAdminPermissions(requiredPermissions = []) {
  const user = await requireAdminAccess();
  await checkPendingStatus();
  
  // Check specific permissions if provided
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some(permission => 
      UnifiedUserService.hasPermission(user, permission)
    );
    
    if (!hasPermission) {
      throw new Error('Access Denied: Insufficient permissions');
    }
  }
  
  return user;
}

/**
 * Get user info from request headers (set by middleware)
 */
export function getUserFromHeaders(headers) {
  const email = headers.get('x-user-email');
  const role = headers.get('x-user-role');
  const userID = headers.get('x-user-id');
  
  if (!email) return null;
  
  return {
    email,
    role,
    userID
  };
}

/**
 * API route authentication helper
 */
export async function authenticateAPIRequest(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: 'Unauthorized',
        status: 401
      };
    }

    const user = await UnifiedUserService.findUserByEmail(session.user.email);
    
    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('API authentication error:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    };
  }
}

/**
 * API route permission checking helper
 */
export async function checkAPIPermissions(request, requiredPermissions = []) {
  const authResult = await authenticateAPIRequest(request);
  
  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.user;

  // Check admin access
  if (!UnifiedUserService.canAccessEfdAdmin(user)) {
    return {
      success: false,
      error: 'Access Denied: Insufficient permissions for admin panel',
      status: 403
    };
  }

  // Check account status
  if (user.status === 'pending') {
    return {
      success: false,
      error: 'Account pending approval',
      status: 403
    };
  }

  if (user.status === 'suspended' || user.status === 'rejected') {
    return {
      success: false,
      error: 'Account suspended or rejected',
      status: 403
    };
  }

  // Check specific permissions
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some(permission => 
      UnifiedUserService.hasPermission(user, permission)
    );
    
    if (!hasPermission) {
      return {
        success: false,
        error: 'Access Denied: Insufficient permissions',
        status: 403
      };
    }
  }

  return {
    success: true,
    user
  };
}