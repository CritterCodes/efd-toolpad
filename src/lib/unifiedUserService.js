/**
 * Unified User Service (Facade)
 * Delegates to modular services in the src/lib/user/ directory.
 * Keeps backward compatibility for all imports.
 */

import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS, ROLE_PERMISSIONS } from './user/user.constants.js';
import { UserQueryService } from './user/user.query.service.js';
import { UserManagementService } from './user/user.management.service.js';
import { UserAuthService } from './user/user.auth.service.js';
import { UserLinkService } from './user/user.link.service.js';
import { UserRoleService } from './user/user.role.service.js';
import { UserNotificationService } from './user/user.notification.service.js';
import { UserAssociationService } from './user/user.association.service.js';

export {
  USER_ROLES,
  USER_STATUS,
  AUTH_PROVIDERS,
  ROLE_PERMISSIONS
};

export class UnifiedUserService {
  // Database Initialization and Maintenance
  static async initializeDatabase() {
    return await UserManagementService.initializeDatabase();
  }

  static async cleanupDuplicateEmails() {
    return await UserManagementService.cleanupDuplicateEmails();
  }

  static async findDuplicateEmails() {
    return await UserManagementService.findDuplicateEmails();
  }

  static async mergeDuplicateUsers(preferredUser, duplicateUsers) {
    return await UserManagementService.mergeDuplicateUsers(preferredUser, duplicateUsers);
  }

  // User Lookup Methods
  static async findUserByEmail(email) {
    return await UserQueryService.findUserByEmail(email);
  }

  static async findUsersByEmail(email) {
    return await UserQueryService.findUsersByEmail(email);
  }

  static async findUserByEmailSafe(email) {
    return await UserQueryService.findUserByEmailSafe(email);
  }

  static async findUserByShopifyId(shopifyId) {
    return await UserQueryService.findUserByShopifyId(shopifyId);
  }

  static async findUserByUserID(userID) {
    return await UserQueryService.findUserByUserID(userID);
  }

  static async findUserByProvider(provider, providerId) {
    return await UserQueryService.findUserByProvider(provider, providerId);
  }

  // Hybrid Authentication Methods
  static async authenticateWithGoogle(googleProfile, additionalData = {}) {
    return await UserAuthService.authenticateWithGoogle(googleProfile, additionalData);
  }

  static async authenticateWithShopify(email, password, additionalData = {}) {
    return await UserAuthService.authenticateWithShopify(email, password, additionalData);
  }

  static async registerWithShopify(userData) {
    return await UserAuthService.registerWithShopify(userData);
  }

  // Account Linking Methods
  static async linkGoogleAccount(userID, googleProfile) {
    return await UserLinkService.linkGoogleAccount(userID, googleProfile);
  }

  static async linkShopifyAccount(userID, email, password) {
    return await UserLinkService.linkShopifyAccount(userID, email, password);
  }

  static async unlinkProvider(userID, provider) {
    return await UserLinkService.unlinkProvider(userID, provider);
  }

  // User Creation & Updates
  static async createOrUpdateUser(shopifyCustomer, additionalData = {}) {
    return await UserManagementService.createOrUpdateUser(shopifyCustomer, additionalData);
  }

  static async createUser(userData) {
    return await UserManagementService.createUser(userData);
  }

  static async updateUserShopifyData(userID, shopifyData) {
    return await UserManagementService.updateUserShopifyData(userID, shopifyData);
  }

  // Role & Permission Management
  static getDefaultStatusForRole(role) {
    return UserRoleService.getDefaultStatusForRole(role);
  }

  static requiresApproval(role) {
    return UserRoleService.requiresApproval(role);
  }

  static canAccessEfdAdmin(user) {
    return UserRoleService.canAccessEfdAdmin(user);
  }

  static canAccessEfdShop(user) {
    return UserRoleService.canAccessEfdShop(user);
  }

  static hasPermission(user, permission) {
    return UserRoleService.hasPermission(user, permission);
  }

  static async updateUserRole(userID, newRole, approvedBy = null) {
    return await UserRoleService.updateUserRole(userID, newRole, approvedBy);
  }

  static shouldAllowRoleUpdate(currentRole, newRole) {
    return UserRoleService.shouldAllowRoleUpdate(currentRole, newRole);
  }

  // Approval Workflow
  static async getPendingUsers() {
    return await UserRoleService.getPendingUsers();
  }

  static async approveUser(userID, approvedBy, notes = '') {
    return await UserRoleService.approveUser(userID, approvedBy, notes);
  }

  static async rejectUser(userID, rejectedBy, reason = '') {
    return await UserRoleService.rejectUser(userID, rejectedBy, reason);
  }

  // Admin User Creation
  static async createAdminUser(userData, createdBy) {
    return await UserRoleService.createAdminUser(userData, createdBy);
  }

  // Utility Methods
  static async getUserStats() {
    return await UserRoleService.getUserStats();
  }

  // Email Notifications (Placeholders)
  static async sendApprovalNotification(user, approved, reason = '') {
    return await UserNotificationService.sendApprovalNotification(user, approved, reason);
  }

  static async sendWelcomeEmail(user) {
    return await UserNotificationService.sendWelcomeEmail(user);
  }

  static async sendPendingApprovalNotification(user) {
    return await UserNotificationService.sendPendingApprovalNotification(user);
  }

  // Legacy Compatibility Methods
  static async getUserByToken(token) {
    return await UserQueryService.getUserByToken(token);
  }

  static async addCustomRequest(userID, requestData) {
    return await UserAssociationService.addCustomRequest(userID, requestData);
  }

  static async addJewelry(userID, jewelryData) {
    return await UserAssociationService.addJewelry(userID, jewelryData);
  }
}

export default UnifiedUserService;
