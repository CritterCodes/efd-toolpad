/**
 * Admin User Creation API Endpoint
 * Allows admins to create staff/dev/admin users
 */

import { UnifiedUserService, USER_ROLES } from '../../../lib/unifiedUserService.js';
import { auth } from '../../../../../auth.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_CREATABLE_ROLES = [USER_ROLES.STAFF, USER_ROLES.DEV, USER_ROLES.ADMIN];

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to create admin users
    const adminUser = await UnifiedUserService.findUserByEmail(session.user.email);
    if (!adminUser || !UnifiedUserService.hasPermission(adminUser, 'userManagement')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to create admin users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { firstName, lastName, email, phoneNumber, role } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'First name, last name, email, and role are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!ADMIN_CREATABLE_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${ADMIN_CREATABLE_ROLES.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if admin user has sufficient permissions to create this role
    if (role === USER_ROLES.ADMIN && !UnifiedUserService.hasPermission(adminUser, 'adminSettings')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to create admin users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = uuidv4().substring(0, 8);
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    const userData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      role,
      tempPassword: hashedTempPassword,
      mustChangePassword: true
    };

    const newUser = await UnifiedUserService.createAdminUser(userData, adminUser.userID);

    // Return user data without password
    const { tempPassword: _, ...userResponse } = newUser;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin user created successfully',
        user: userResponse,
        temporaryPassword: tempPassword // Send plain text password only in response
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create admin user API error:', error);
    
    if (error.message.includes('already exists')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to view user stats
    const adminUser = await UnifiedUserService.findUserByEmail(session.user.email);
    if (!adminUser || !UnifiedUserService.hasPermission(adminUser, 'userManagement')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stats = await UnifiedUserService.getUserStats();

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        availableRoles: ADMIN_CREATABLE_ROLES
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get user stats API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}