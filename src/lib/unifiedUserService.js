/**
 * Unified User Service
 * Handles user management across efd-shop and efd-admin with role-based access control
 * Supports both Google OAuth and Shopify authentication with account linking
 */

import { connectToDatabase } from './mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import ShopifyCustomerService from './shopifyCustomerService.js';

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

// Authentication providers
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  SHOPIFY: 'shopify'
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
  
  static shopifyService = new ShopifyCustomerService();
  
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

  static async findUserByProvider(provider, providerId) {
    try {
      const { db } = await connectToDatabase();
      const query = {};
      query[`providers.${provider}.id`] = providerId;
      const user = await db.collection('users').findOne(query);
      return user;
    } catch (error) {
      console.error(`Error finding user by ${provider} ID:`, error);
      throw error;
    }
  }

  // =====================
  // Hybrid Authentication Methods
  // =====================

  /**
   * Authenticate user with Google OAuth and create/link Shopify account
   */
  static async authenticateWithGoogle(googleProfile, additionalData = {}) {
    try {
      const { db } = await connectToDatabase();
      
      // Check if user exists by email
      let user = await this.findUserByEmail(googleProfile.email);
      
      if (user) {
        // User exists - update Google provider data and link Shopify if needed
        const updateData = {
          [`providers.${AUTH_PROVIDERS.GOOGLE}`]: {
            id: googleProfile.sub,
            verified: true,
            profile: googleProfile,
            lastSignIn: new Date()
          },
          lastSignIn: new Date(),
          updatedAt: new Date()
        };

        // If user doesn't have Shopify account, create one
        if (!user.providers?.shopify?.id) {
          try {
            const shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
            updateData[`providers.${AUTH_PROVIDERS.SHOPIFY}`] = {
              id: shopifyCustomer.id,
              verified: true,
              lastSignIn: new Date()
            };
            updateData.primaryProvider = user.primaryProvider || AUTH_PROVIDERS.GOOGLE;
            console.log('✅ Created Shopify account for existing Google user');
          } catch (shopifyError) {
            console.warn('Failed to create Shopify account for Google user:', shopifyError.message);
          }
        } else {
          // Link existing Shopify account
          try {
            await this.shopifyService.linkGoogleAccount(user.providers.shopify.id, googleProfile);
            updateData.linkedAt = new Date();
            console.log('✅ Linked Google account to existing Shopify customer');
          } catch (linkError) {
            console.warn('Failed to link Google account to Shopify:', linkError.message);
          }
        }

        await db.collection('users').updateOne(
          { userID: user.userID },
          { $set: updateData }
        );

        return await this.findUserByUserID(user.userID);
      } else {
        // New user - create both Google and Shopify accounts
        let shopifyCustomer = null;
        try {
          shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
          console.log('✅ Created Shopify account for new Google user');
        } catch (shopifyError) {
          console.warn('Failed to create Shopify account for new Google user:', shopifyError.message);
        }

        const newUser = {
          userID: uuidv4(),
          email: googleProfile.email,
          firstName: googleProfile.given_name,
          lastName: googleProfile.family_name,
          role: additionalData.role || USER_ROLES.CLIENT,
          status: this.getDefaultStatusForRole(additionalData.role || USER_ROLES.CLIENT),
          permissions: ROLE_PERMISSIONS[additionalData.role || USER_ROLES.CLIENT],
          primaryProvider: AUTH_PROVIDERS.GOOGLE,
          providers: {
            [AUTH_PROVIDERS.GOOGLE]: {
              id: googleProfile.sub,
              verified: true,
              profile: googleProfile,
              lastSignIn: new Date()
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignIn: new Date(),
          approvalData: this.requiresApproval(additionalData.role || USER_ROLES.CLIENT) ? {
            requestedAt: new Date(),
            requestedRole: additionalData.role || USER_ROLES.CLIENT,
            businessInfo: additionalData.businessInfo || {},
            status: USER_STATUS.PENDING
          } : null,
          ...additionalData
        };

        // Add Shopify provider data if account was created successfully
        if (shopifyCustomer) {
          newUser.providers[AUTH_PROVIDERS.SHOPIFY] = {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          };
        }

        await db.collection('users').insertOne(newUser);
        console.log('✅ Created new unified user account for Google user');
        return newUser;
      }
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with Shopify and link Google account if exists
   */
  static async authenticateWithShopify(email, password, additionalData = {}) {
    try {
      const { db } = await connectToDatabase();
      
      // Authenticate with Shopify first
      const shopifyAuth = await this.shopifyService.authenticateCustomer(email, password);
      const shopifyCustomer = shopifyAuth.customer;

      // Check if user exists by email
      let user = await this.findUserByEmail(email);
      
      if (user) {
        // User exists - update Shopify provider data
        const updateData = {
          [`providers.${AUTH_PROVIDERS.SHOPIFY}`]: {
            id: shopifyCustomer.id,
            verified: true,
            customerAccessToken: shopifyAuth.accessToken,
            lastSignIn: new Date()
          },
          lastSignIn: new Date(),
          updatedAt: new Date()
        };

        // If user has Google account, ensure linking
        if (user.providers?.google?.id) {
          try {
            await this.shopifyService.linkGoogleAccount(shopifyCustomer.id, user.providers.google.profile);
            updateData.linkedAt = new Date();
            console.log('✅ Linked existing Google account to Shopify authentication');
          } catch (linkError) {
            console.warn('Failed to link Google account during Shopify auth:', linkError.message);
          }
        }

        await db.collection('users').updateOne(
          { userID: user.userID },
          { $set: updateData }
        );

        const updatedUser = await this.findUserByUserID(user.userID);
        return {
          user: updatedUser,
          shopifyAuth
        };
      } else {
        // New user - create unified account
        const newUser = {
          userID: uuidv4(),
          email: shopifyCustomer.email,
          firstName: shopifyCustomer.firstName,
          lastName: shopifyCustomer.lastName,
          phoneNumber: shopifyCustomer.phone,
          role: additionalData.role || USER_ROLES.CLIENT,
          status: this.getDefaultStatusForRole(additionalData.role || USER_ROLES.CLIENT),
          permissions: ROLE_PERMISSIONS[additionalData.role || USER_ROLES.CLIENT],
          primaryProvider: AUTH_PROVIDERS.SHOPIFY,
          providers: {
            [AUTH_PROVIDERS.SHOPIFY]: {
              id: shopifyCustomer.id,
              verified: true,
              customerAccessToken: shopifyAuth.accessToken,
              lastSignIn: new Date()
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignIn: new Date(),
          approvalData: this.requiresApproval(additionalData.role || USER_ROLES.CLIENT) ? {
            requestedAt: new Date(),
            requestedRole: additionalData.role || USER_ROLES.CLIENT,
            businessInfo: additionalData.businessInfo || {},
            status: USER_STATUS.PENDING
          } : null,
          ...additionalData
        };

        await db.collection('users').insertOne(newUser);
        console.log('✅ Created new unified user account for Shopify user');
        
        return {
          user: newUser,
          shopifyAuth
        };
      }
    } catch (error) {
      console.error('Error authenticating with Shopify:', error);
      throw error;
    }
  }

  /**
   * Register new user with Shopify and optional role
   */
  static async registerWithShopify(userData) {
    try {
      const { email, password, firstName, lastName, phoneNumber, role, businessInfo } = userData;
      
      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Register with Shopify
      const shopifyCustomer = await this.shopifyService.registerCustomer({
        firstName,
        lastName,
        email,
        password,
        phoneNumber
      });

      // Create unified user account
      const newUser = {
        userID: uuidv4(),
        email: email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        role: role || USER_ROLES.CLIENT,
        status: this.getDefaultStatusForRole(role || USER_ROLES.CLIENT),
        permissions: ROLE_PERMISSIONS[role || USER_ROLES.CLIENT],
        primaryProvider: AUTH_PROVIDERS.SHOPIFY,
        providers: {
          [AUTH_PROVIDERS.SHOPIFY]: {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
        approvalData: this.requiresApproval(role || USER_ROLES.CLIENT) ? {
          requestedAt: new Date(),
          requestedRole: role || USER_ROLES.CLIENT,
          businessInfo: businessInfo || {},
          status: USER_STATUS.PENDING
        } : null
      };

      const { db } = await connectToDatabase();
      await db.collection('users').insertOne(newUser);

      console.log('✅ Registered new user with Shopify account');
      
      // Send pending approval notification if needed
      if (this.requiresApproval(role || USER_ROLES.CLIENT)) {
        await this.sendPendingApprovalNotification(newUser);
      }

      return newUser;
    } catch (error) {
      console.error('Error registering with Shopify:', error);
      throw error;
    }
  }

  // =====================
  // Account Linking Methods
  // =====================

  /**
   * Link Google account to existing user
   */
  static async linkGoogleAccount(userID, googleProfile) {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.providers?.google?.id) {
        throw new Error('Google account already linked');
      }

      const updateData = {
        [`providers.${AUTH_PROVIDERS.GOOGLE}`]: {
          id: googleProfile.sub,
          verified: true,
          profile: googleProfile,
          lastSignIn: new Date()
        },
        linkedAt: new Date(),
        updatedAt: new Date()
      };

      // Create Shopify customer if doesn't exist
      if (!user.providers?.shopify?.id) {
        try {
          const shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
          updateData[`providers.${AUTH_PROVIDERS.SHOPIFY}`] = {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          };
        } catch (shopifyError) {
          console.warn('Failed to create Shopify account during Google linking:', shopifyError.message);
        }
      } else {
        // Link to existing Shopify account
        try {
          await this.shopifyService.linkGoogleAccount(user.providers.shopify.id, googleProfile);
        } catch (linkError) {
          console.warn('Failed to link Google account to Shopify:', linkError.message);
        }
      }

      await db.collection('users').updateOne(
        { userID },
        { $set: updateData }
      );

      console.log('✅ Successfully linked Google account to user');
      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  }

  /**
   * Link Shopify account to existing user
   */
  static async linkShopifyAccount(userID, email, password) {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.providers?.shopify?.id) {
        throw new Error('Shopify account already linked');
      }

      // Authenticate with Shopify
      const shopifyAuth = await this.shopifyService.authenticateCustomer(email, password);
      const shopifyCustomer = shopifyAuth.customer;

      const updateData = {
        [`providers.${AUTH_PROVIDERS.SHOPIFY}`]: {
          id: shopifyCustomer.id,
          verified: true,
          customerAccessToken: shopifyAuth.accessToken,
          lastSignIn: new Date()
        },
        linkedAt: new Date(),
        updatedAt: new Date()
      };

      // Link Google account if exists
      if (user.providers?.google?.id) {
        try {
          await this.shopifyService.linkGoogleAccount(shopifyCustomer.id, user.providers.google.profile);
        } catch (linkError) {
          console.warn('Failed to link Google account to Shopify during linking:', linkError.message);
        }
      }

      await db.collection('users').updateOne(
        { userID },
        { $set: updateData }
      );

      console.log('✅ Successfully linked Shopify account to user');
      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error('Error linking Shopify account:', error);
      throw error;
    }
  }

  /**
   * Unlink provider account
   */
  static async unlinkProvider(userID, provider) {
    try {
      const { db } = await connectToDatabase();
      const user = await this.findUserByUserID(userID);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.providers?.[provider]) {
        throw new Error(`${provider} account not linked`);
      }

      // Don't allow unlinking if it's the only provider
      const linkedProviders = Object.keys(user.providers || {});
      if (linkedProviders.length <= 1) {
        throw new Error('Cannot unlink the only authentication provider');
      }

      const updateData = {
        [`providers.${provider}`]: null,
        updatedAt: new Date()
      };

      await db.collection('users').updateOne(
        { userID },
        { 
          $unset: { [`providers.${provider}`]: "" },
          $set: { updatedAt: new Date() }
        }
      );

      console.log(`✅ Successfully unlinked ${provider} account from user`);
      return await this.findUserByUserID(userID);
    } catch (error) {
      console.error(`Error unlinking ${provider} account:`, error);
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