import { connectToDatabase } from '../mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import { USER_ROLES, USER_STATUS, ROLE_PERMISSIONS } from './user.constants.js';
import { UserQueryService } from './user.query.service.js';
import { UserNotificationService } from './user.notification.service.js';

export class UserRoleService {
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
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');

      const updateData = {
        role: newRole,
        permissions: ROLE_PERMISSIONS[newRole],
        status: this.getDefaultStatusForRole(newRole),
        updatedAt: new Date()
      };

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

      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  static async getPendingUsers() {
    try {
      const { db } = await connectToDatabase();
      return await db.collection('users').find({ status: USER_STATUS.PENDING }).toArray();
    } catch (error) {
      console.error('Error getting pending users:', error);
      throw error;
    }
  }

  static async approveUser(userID, approvedBy, notes = '') {
    try {
      const { db } = await connectToDatabase();
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');
      if (!user.approvalData) throw new Error('User does not require approval');

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

      await UserNotificationService.sendApprovalNotification(user, true);
      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  }

  static async rejectUser(userID, rejectedBy, reason = '') {
    try {
      const { db } = await connectToDatabase();
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');

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

      await UserNotificationService.sendApprovalNotification(user, false, reason);
      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error('Error rejecting user:', error);
      throw error;
    }
  }

  static async createAdminUser(userData, createdBy) {
    try {
      const { db } = await connectToDatabase();
      const existingUser = await UserQueryService.findUserByEmail(userData.email);
      if (existingUser) throw new Error('User with this email already exists');

      const newUser = {
        userID: uuidv4(),
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
      await UserNotificationService.sendWelcomeEmail(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

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

      return { totalUsers, pendingUsers, activeUsers, roleStats };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  static shouldAllowRoleUpdate(currentRole, newRole) {
    const roleHierarchy = {
      [USER_ROLES.CLIENT]: 1,
      [USER_ROLES.WHOLESALER]: 2,
      [USER_ROLES.ARTISAN_APPLICANT]: 3,
      [USER_ROLES.ARTISAN]: 4,
      [USER_ROLES.STAFF]: 5,
      [USER_ROLES.DEV]: 6,
      [USER_ROLES.ADMIN]: 7
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const newLevel = roleHierarchy[newRole] || 0;

    if (currentLevel >= 5) {
      return newLevel >= currentLevel;
    }
    return true;
  }
}
