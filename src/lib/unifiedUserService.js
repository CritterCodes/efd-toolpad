/**
 * Unified User Service
 * Handles user management across efd-shop and efd-admin with role-based access control
 */

import { connectToDatabase } from './mongodb.js';
import { v4 as uuidv4 } from 'uuid';

// User roles and their hierarchy
export const USER_ROLES = {
  CLIENT: 'client',
  WHOLESALER: 'wholesaler',
  ARTISAN_APPLICANT: 'artisan-applicant',
  ARTISAN: 'artisan',
  STAFF: 'staff',
  DEV: 'dev',
  ADMIN: 'admin'
};

// User status values
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
};

// Permission definitions for each role
export const ROLE_PERMISSIONS = {
  [USER_ROLES.CLIENT]: {
    efdShop: true,
    efdAdmin: false,
    adminSettings: false,
    userManagement: false,
    orderManagement: false,
    repairManagement: false,
    inventoryManagement: false,
    analyticsView: false
  },
  [USER_ROLES.WHOLESALER]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: true,
    repairManagement: false,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.ARTISAN_APPLICANT]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: false,
    repairManagement: true,
    inventoryManagement: false,
    analyticsView: false
  },
  [USER_ROLES.ARTISAN]: {
    efdShop: true,
    efdAdmin: true,
    adminSettings: false,
    userManagement: false,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.STAFF]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: false,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.DEV]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: true,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  },
  [USER_ROLES.ADMIN]: {
    efdShop: false,
    efdAdmin: true,
    adminSettings: true,
    userManagement: true,
    orderManagement: true,
    repairManagement: true,
    inventoryManagement: true,
    analyticsView: true
  }
};

export class UnifiedUserService {
  
  // =====================
  // User Lookup Methods
  // =====================
  
  static async findUserByEmail(email) {
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ email });
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findUserByShopifyId(shopifyId) {
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ shopifyId });
      return user;
    } catch (error) {
      console.error('Error finding user by Shopify ID:', error);
      throw error;
    }
  }

  static async findUserByUserID(userID) {
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ userID });
      return user;
    } catch (error) {
      console.error('Error finding user by userID:', error);
      throw error;
    }
  }

  // =====================
  // User Creation & Updates
  // =====================

  static async createOrUpdateUser(shopifyCustomer, additionalData = {}) {
    try {
      const { db } = await connectToDatabase();
      const existingUser = await this.findUserByShopifyId(shopifyCustomer.id);
      
      if (existingUser) {
        // Update existing user with latest Shopify data
        const updateData = {
          firstName: shopifyCustomer.firstName || existingUser.firstName,
          lastName: shopifyCustomer.lastName || existingUser.lastName,
          email: shopifyCustomer.email || existingUser.email,
          phoneNumber: shopifyCustomer.phone || existingUser.phoneNumber,
          updatedAt: new Date(),
          shopifyData: {
            id: shopifyCustomer.id,
            createdAt: shopifyCustomer.createdAt,
            updatedAt: shopifyCustomer.updatedAt,
            acceptsMarketing: shopifyCustomer.acceptsMarketing,
            defaultAddress: shopifyCustomer.defaultAddress
          },
          ...additionalData
        };

        await db.collection('users').updateOne(
          { shopifyId: shopifyCustomer.id },
          { $set: updateData }
        );

        return await this.findUserByShopifyId(shopifyCustomer.id);
      } else {
        // Create new user
        const newUser = {
          userID: uuidv4(),
          shopifyId: shopifyCustomer.id,
          firstName: shopifyCustomer.firstName,
          lastName: shopifyCustomer.lastName,
          email: shopifyCustomer.email,
          phoneNumber: shopifyCustomer.phone,
          role: additionalData.role || USER_ROLES.CLIENT,
          status: this.getDefaultStatusForRole(additionalData.role || USER_ROLES.CLIENT),
          permissions: ROLE_PERMISSIONS[additionalData.role || USER_ROLES.CLIENT],
          createdAt: new Date(),
          updatedAt: new Date(),
          shopifyData: {
            id: shopifyCustomer.id,
            createdAt: shopifyCustomer.createdAt,
            updatedAt: shopifyCustomer.updatedAt,
            acceptsMarketing: shopifyCustomer.acceptsMarketing,
            defaultAddress: shopifyCustomer.defaultAddress
          },
          approvalData: this.requiresApproval(additionalData.role || USER_ROLES.CLIENT) ? {
            requestedAt: new Date(),
            requestedRole: additionalData.role || USER_ROLES.CLIENT,
            businessInfo: additionalData.businessInfo || {},
            status: USER_STATUS.PENDING
          } : null,
          ...additionalData
        };

        await db.collection('users').insertOne(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // =====================
  // Role & Permission Management
  // =====================

  static getDefaultStatusForRole(role) {
    switch (role) {
      case USER_ROLES.CLIENT:
        return USER_STATUS.ACTIVE;
      case USER_ROLES.WHOLESALER:
      case USER_ROLES.ARTISAN_APPLICANT:
        return USER_STATUS.PENDING;
      case USER_ROLES.ARTISAN:
      case USER_ROLES.STAFF:
      case USER_ROLES.DEV:
      case USER_ROLES.ADMIN:
        return USER_STATUS.ACTIVE;
      default:
        return USER_STATUS.PENDING;
    }
  }

  static requiresApproval(role) {
    return [
      USER_ROLES.WHOLESALER,
      USER_ROLES.ARTISAN_APPLICANT,
      USER_ROLES.ARTISAN
    ].includes(role);
  }

  static canAccessEfdAdmin(user) {
    if (!user || !user.permissions) return false;
    return user.permissions.efdAdmin === true;
  }

  static canAccessEfdShop(user) {
    if (!user || !user.permissions) return false;
    return user.permissions.efdShop === true;
  }

  static hasPermission(user, permission) {
    if (!user || !user.permissions) return false;
    return user.permissions[permission] === true;
  }

  static async updateUserRole(userID, newRole, approvedBy = null) {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      const updateData = {
        role: newRole,
        permissions: ROLE_PERMISSIONS[newRole],
        status: this.getDefaultStatusForRole(newRole),
        updatedAt: new Date()
      };

      // If this is an approval, update approval data
      if (approvedBy && user.approvalData) {
        updateData.approvalData = {
          ...user.approvalData,
          status: USER_STATUS.APPROVED,
          approvedBy: approvedBy,
          approvedAt: new Date()
        };
      }

      await db.collection('users').updateOne(
        { userID },
        { $set: updateData }
      );

      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // =====================
  // Approval Workflow
  // =====================

  static async getPendingUsers() {
    try {
      const { db } = await connectToDatabase();
      const users = await db.collection('users').find({
        status: USER_STATUS.PENDING
      }).toArray();
      return users;
    } catch (error) {
      console.error('Error getting pending users:', error);
      throw error;
    }
  }

  static async approveUser(userID, approvedBy, notes = '') {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.approvalData) {
        throw new Error('User does not require approval');
      }

      const requestedRole = user.approvalData.requestedRole;
      const updateData = {
        role: requestedRole,
        permissions: ROLE_PERMISSIONS[requestedRole],
        status: USER_STATUS.APPROVED,
        updatedAt: new Date(),
        approvalData: {
          ...user.approvalData,
          status: USER_STATUS.APPROVED,
          approvedBy: approvedBy,
          approvedAt: new Date(),
          notes: notes
        }
      };

      await db.collection('users').updateOne(
        { userID },
        { $set: updateData }
      );

      // TODO: Send approval email notification
      await this.sendApprovalNotification(user, true);

      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  }

  static async rejectUser(userID, rejectedBy, reason = '') {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      const updateData = {
        status: USER_STATUS.REJECTED,
        updatedAt: new Date(),
        approvalData: {
          ...user.approvalData,
          status: USER_STATUS.REJECTED,
          rejectedBy: rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: reason
        }
      };

      await db.collection('users').updateOne(
        { userID },
        { $set: updateData }
      );

      // TODO: Send rejection email notification
      await this.sendApprovalNotification(user, false, reason);

      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  }

  // =====================
  // Admin User Creation
  // =====================

  static async createAdminUser(userData, createdBy) {
    try {
      const { db } = await connectToDatabase();
      
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user with admin role
      const newUser = {
        userID: uuidv4(),
        shopifyId: null, // Admin users may not have Shopify accounts
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber || null,
        role: userData.role,
        status: USER_STATUS.ACTIVE,
        permissions: ROLE_PERMISSIONS[userData.role],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: createdBy,
        isAdminCreated: true,
        tempPassword: userData.tempPassword || null
      };

      await db.collection('users').insertOne(newUser);
      
      // TODO: Send welcome email with temporary password
      await this.sendWelcomeEmail(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  // =====================
  // Utility Methods
  // =====================

  static async getUserStats() {
    try {
      const { db } = await connectToDatabase();
      
      const totalUsers = await db.collection('users').countDocuments();
      const pendingUsers = await db.collection('users').countDocuments({ status: USER_STATUS.PENDING });
      const activeUsers = await db.collection('users').countDocuments({ status: USER_STATUS.ACTIVE });
      
      const roleStats = {};
      for (const role of Object.values(USER_ROLES)) {
        roleStats[role] = await db.collection('users').countDocuments({ role });
      }

      return {
        totalUsers,
        pendingUsers,
        activeUsers,
        roleStats
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // =====================
  // Email Notifications (Placeholders)
  // =====================

  static async sendApprovalNotification(user, approved, reason = '') {
    // TODO: Implement email notification service
    console.log(`Sending ${approved ? 'approval' : 'rejection'} notification to ${user.email}`);
    if (!approved && reason) {
      console.log(`Rejection reason: ${reason}`);
    }
  }

  static async sendWelcomeEmail(user) {
    // TODO: Implement welcome email with temporary password
    console.log(`Sending welcome email to ${user.email}`);
  }

  static async sendPendingApprovalNotification(user) {
    // TODO: Implement notification to admins about pending approval
    console.log(`User ${user.email} requires approval for role: ${user.role}`);
  }

  // =====================
  // Legacy Compatibility Methods
  // =====================

  static async getUserByToken(token) {
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ shopifyCustomerToken: token });
      return user;
    } catch (error) {
      console.error('Error finding user by token:', error);
      throw error;
    }
  }

  static async addCustomRequest(userID, requestData) {
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('users').updateOne(
        { userID },
        { 
          $push: { customRequests: requestData },
          $set: { updatedAt: new Date() }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding custom request:', error);
      throw error;
    }
  }

  static async addJewelry(userID, jewelryData) {
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('users').updateOne(
        { userID },
        { 
          $push: { jewelry: jewelryData },
          $set: { updatedAt: new Date() }
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }
      
      return result;
    } catch (error) {
      console.error('Error adding jewelry:', error);
      throw error;
    }
  }
}

export default UnifiedUserService;