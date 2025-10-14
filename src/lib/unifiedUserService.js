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
  // Database Initialization and Maintenance
  // =====================

  /**
   * Initialize database indexes to prevent duplicate emails
   */
  static async initializeDatabase() {
    try {
      const { db } = await connectToDatabase();
      
      // Create unique index on email field
      await db.collection('users').createIndex(
        { email: 1 },
        { 
          unique: true,
          background: true,
          name: 'unique_email_index'
        }
      );
      
      console.log('✅ Created unique email index');
      
      // Create other useful indexes
      await db.collection('users').createIndex(
        { userID: 1 },
        { 
          unique: true,
          background: true,
          name: 'unique_userID_index'
        }
      );
      
      await db.collection('users').createIndex(
        { 'providers.google.id': 1 },
        { 
          background: true,
          sparse: true,
          name: 'google_id_index'
        }
      );
      
      await db.collection('users').createIndex(
        { 'providers.shopify.id': 1 },
        { 
          background: true,
          sparse: true,
          name: 'shopify_id_index'
        }
      );
      
      console.log('✅ Initialized all database indexes');
      
    } catch (error) {
      if (error.code === 11000) {
        console.warn('⚠️ Duplicate email index creation failed - duplicates exist in database');
        await this.cleanupDuplicateEmails();
        // Try again after cleanup
        await this.initializeDatabase();
      } else {
        console.error('Error initializing database:', error);
        throw error;
      }
    }
  }

  /**
   * Find and cleanup all duplicate emails in the database
   */
  static async cleanupDuplicateEmails() {
    try {
      const { db } = await connectToDatabase();
      
      console.log('🔄 Scanning for duplicate emails...');
      
      // Find all emails that have duplicates
      const duplicateEmails = await this.findDuplicateEmails();
      
      console.log(`Found ${duplicateEmails.length} emails with duplicates`);
      
      for (const emailGroup of duplicateEmails) {
        const email = emailGroup._id;
        const users = emailGroup.users;
        
        console.log(`🔄 Processing ${users.length} duplicates for ${email}`);
        
        // Sort by preference: most recent updatedAt, then most complete provider data
        const sortedUsers = users.sort((a, b) => {
          // Prefer user with more providers
          const aProviders = Object.keys(a.providers || {}).length;
          const bProviders = Object.keys(b.providers || {}).length;
          if (aProviders !== bProviders) {
            return bProviders - aProviders;
          }
          
          // Then prefer most recently updated
          const aUpdated = new Date(a.updatedAt || a.createdAt || 0);
          const bUpdated = new Date(b.updatedAt || b.createdAt || 0);
          return bUpdated - aUpdated;
        });
        
        const preferredUser = sortedUsers[0];
        const duplicateUsers = sortedUsers.slice(1);
        
        // Merge the duplicates into the preferred user
        await this.mergeDuplicateUsers(preferredUser, duplicateUsers);
      }
      
      console.log('✅ Completed duplicate email cleanup');
      
    } catch (error) {
      console.error('Error cleaning up duplicate emails:', error);
      throw error;
    }
  }

  /**
   * Find all emails that have duplicate users
   */
  static async findDuplicateEmails() {
    try {
      const { db } = await connectToDatabase();
      
      return await db.collection('users').aggregate([
        {
          $group: {
            _id: '$email',
            count: { $sum: 1 },
            users: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]).toArray();
      
    } catch (error) {
      console.error('Error finding duplicate emails:', error);
      throw error;
    }
  }

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

  /**
   * Find all users with the same email (to detect duplicates)
   */
  static async findUsersByEmail(email) {
    try {
      const { db } = await connectToDatabase();
      const users = await db.collection('users').find({ email }).toArray();
      return users;
    } catch (error) {
      console.error('Error finding users by email:', error);
      throw error;
    }
  }

  /**
   * Find user by email with duplicate detection and resolution
   */
  static async findUserByEmailSafe(email) {
    try {
      const users = await this.findUsersByEmail(email);
      
      if (users.length === 0) {
        return null;
      }
      
      if (users.length === 1) {
        return users[0];
      }
      
      // Handle duplicates - prefer the most recently updated user with the most complete data
      console.warn(`🔄 Found ${users.length} duplicate users for email: ${email}`);
      
      // Sort by preference: most recent updatedAt, then most complete provider data
      const sortedUsers = users.sort((a, b) => {
        // Prefer user with more providers
        const aProviders = Object.keys(a.providers || {}).length;
        const bProviders = Object.keys(b.providers || {}).length;
        if (aProviders !== bProviders) {
          return bProviders - aProviders;
        }
        
        // Then prefer most recently updated
        const aUpdated = new Date(a.updatedAt || a.createdAt || 0);
        const bUpdated = new Date(b.updatedAt || b.createdAt || 0);
        return bUpdated - aUpdated;
      });
      
      const preferredUser = sortedUsers[0];
      console.log(`✅ Selected user ${preferredUser.userID} as preferred from ${users.length} duplicates`);
      
      // Optionally merge data from other users into the preferred user
      await this.mergeDuplicateUsers(preferredUser, sortedUsers.slice(1));
      
      return preferredUser;
    } catch (error) {
      console.error('Error finding user by email safely:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate users into a single preferred user
   */
  static async mergeDuplicateUsers(preferredUser, duplicateUsers) {
    try {
      const { db } = await connectToDatabase();
      
      if (duplicateUsers.length === 0) return;
      
      console.log(`🔄 Merging ${duplicateUsers.length} duplicate users into ${preferredUser.userID}`);
      
      const mergeData = {
        providers: { ...preferredUser.providers },
        updatedAt: new Date(),
        mergedFrom: duplicateUsers.map(u => u.userID)
      };
      
      // Merge provider data from duplicates
      for (const duplicate of duplicateUsers) {
        if (duplicate.providers) {
          Object.entries(duplicate.providers).forEach(([provider, data]) => {
            if (!mergeData.providers[provider] || !mergeData.providers[provider].verified) {
              mergeData.providers[provider] = data;
              console.log(`✅ Merged ${provider} provider data from duplicate user`);
            }
          });
        }
        
        // Merge other important fields if they're missing from preferred user
        if (!preferredUser.firstName && duplicate.firstName) {
          mergeData.firstName = duplicate.firstName;
        }
        if (!preferredUser.lastName && duplicate.lastName) {
          mergeData.lastName = duplicate.lastName;
        }
        if (!preferredUser.phoneNumber && duplicate.phoneNumber) {
          mergeData.phoneNumber = duplicate.phoneNumber;
        }
      }
      
      // Update the preferred user with merged data
      await db.collection('users').updateOne(
        { userID: preferredUser.userID },
        { $set: mergeData }
      );
      
      // Remove duplicate users
      const duplicateIds = duplicateUsers.map(u => u.userID);
      await db.collection('users').deleteMany({
        userID: { $in: duplicateIds }
      });
      
      console.log(`✅ Removed ${duplicateUsers.length} duplicate users: ${duplicateIds.join(', ')}`);
      
    } catch (error) {
      console.error('Error merging duplicate users:', error);
      // Don't throw - continue with the preferred user even if merge fails
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
      console.log('🔍 findUserByUserID - Looking for userID:', userID);
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ userID });
      console.log('📋 findUserByUserID - Database result:', user ? {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        primaryProvider: user.primaryProvider
      } : 'USER NOT FOUND');
      return user;
    } catch (error) {
      console.error('❌ Error finding user by userID:', error);
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
    console.log("🔄 UnifiedUserService.authenticateWithGoogle started for:", googleProfile.email);
    try {
      const { db } = await connectToDatabase();
      console.log("✅ Database connection successful");
      
      // Check if user exists by email (with duplicate detection)
      console.log("🔍 Looking up user by email...");
      let user = await this.findUserByEmailSafe(googleProfile.email);
      console.log("📋 User lookup result:", user ? `Found user ${user.userID}` : 'User not found');
      
      if (user) {
        // User exists - handle both new dual-auth users and legacy users
        console.log(`🔄 Updating existing user: ${user.email}`);
        
        const updateData = {
          lastSignIn: new Date(),
          updatedAt: new Date()
        };

        // 🔄 LEGACY USER MIGRATION: Handle providers structure
        if (!user.providers) {
          console.log('🔄 Migrating legacy user - initializing providers object');
          // For legacy users, create the entire providers structure at once
          updateData.providers = {
            [AUTH_PROVIDERS.GOOGLE]: {
              id: googleProfile.sub,
              verified: true,
              profile: googleProfile,
              lastSignIn: new Date()
            }
          };
          updateData.primaryProvider = AUTH_PROVIDERS.GOOGLE;
        } else {
          // For existing dual-auth users, just update the Google provider
          updateData[`providers.${AUTH_PROVIDERS.GOOGLE}`] = {
            id: googleProfile.sub,
            verified: true,
            profile: googleProfile,
            lastSignIn: new Date()
          };
        }

        // 🔄 LEGACY USER MIGRATION: Set primary provider if missing
        if (!user.primaryProvider) {
          updateData.primaryProvider = AUTH_PROVIDERS.GOOGLE;
        }

        // Update role only if specified and different (but preserve existing roles for existing users)
        if (additionalData.role && additionalData.role !== user.role) {
          // Only update role if it's not downgrading an existing admin/staff user
          const shouldUpdateRole = this.shouldAllowRoleUpdate(user.role, additionalData.role);
          if (shouldUpdateRole) {
            updateData.role = additionalData.role;
            updateData.permissions = ROLE_PERMISSIONS[additionalData.role];
            updateData.status = this.getDefaultStatusForRole(additionalData.role);
            console.log(`✅ Updated user role from ${user.role} to ${additionalData.role}`);
          } else {
            console.log(`⚠️ Preserving existing role ${user.role}, not updating to ${additionalData.role}`);
          }
        }

        // 🔄 LEGACY USER MIGRATION: Create Shopify account if missing
        // For legacy users, user.providers might be undefined, so we need to check carefully
        const hasShopifyAccount = user.providers?.shopify?.id;
        
        if (!hasShopifyAccount) {
          try {
            console.log('🔄 Creating Shopify account for user (legacy migration or new Google user)');
            const shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
            
            // Handle Shopify provider data based on whether we're migrating legacy user or updating existing
            if (!user.providers) {
              // Legacy user - providers object is being created, add Shopify to it
              updateData.providers[AUTH_PROVIDERS.SHOPIFY] = {
                id: shopifyCustomer.id,
                verified: true,
                lastSignIn: new Date()
              };
            } else {
              // Existing dual-auth user - update just the Shopify provider
              updateData[`providers.${AUTH_PROVIDERS.SHOPIFY}`] = {
                id: shopifyCustomer.id,
                verified: true,
                lastSignIn: new Date()
              };
            }
            console.log('✅ Created Shopify account for user');
          } catch (shopifyError) {
            console.warn('⚠️ Failed to create Shopify account (non-blocking):', shopifyError.message);
            // Continue without Shopify - this shouldn't block authentication
          }
        } else {
          // Link existing Shopify account
          try {
            await this.shopifyService.linkGoogleAccount(user.providers.shopify.id, googleProfile);
            updateData.linkedAt = new Date();
            console.log('✅ Linked Google account to existing Shopify customer');
          } catch (linkError) {
            console.warn('⚠️ Failed to link Google account to Shopify (non-blocking):', linkError.message);
            // Continue without linking - this shouldn't block authentication
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
      console.error('❌ ERROR in authenticateWithGoogle:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      throw new Error(`Google authentication failed: ${error.message}`);
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

      // Check if user exists by email (with duplicate detection)
      let user = await this.findUserByEmailSafe(email);
      
      if (user) {
        // User exists - handle both new dual-auth users and legacy users
        console.log(`🔄 Updating existing user via Shopify: ${user.email}`);
        
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

        // 🔄 LEGACY USER MIGRATION: Initialize providers object if missing
        if (!user.providers) {
          console.log('🔄 Migrating legacy user via Shopify - initializing providers object');
          updateData.providers = {};
          updateData.primaryProvider = AUTH_PROVIDERS.SHOPIFY;
        }

        // 🔄 LEGACY USER MIGRATION: Set primary provider if missing
        if (!user.primaryProvider) {
          updateData.primaryProvider = AUTH_PROVIDERS.SHOPIFY;
        }

        // Link existing Google account if present
        if (user.providers?.google?.id) {
          try {
            await this.shopifyService.linkGoogleAccount(shopifyCustomer.id, user.providers.google.profile);
            updateData.linkedAt = new Date();
            console.log('✅ Linked existing Google account to Shopify authentication');
          } catch (linkError) {
            console.warn('⚠️ Failed to link Google account during Shopify auth (non-blocking):', linkError.message);
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
      
      // Check if user already exists (with duplicate detection)
      const existingUser = await this.findUserByEmailSafe(email);
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

  /**
   * Create a new user directly in the database
   */
  static async createUser(userData) {
    try {
      await connectToDatabase();
      
      const newUser = {
        userID: userData.userID || `user-${uuidv4().substring(0, 8)}`,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role || USER_ROLES.CLIENT,
        status: userData.status || USER_STATUS.PENDING,
        phoneNumber: userData.phoneNumber || '',
        address: userData.address || {},
        shopifyId: userData.shopifyId || null,
        providers: userData.providers || {},
        primaryProvider: userData.primaryProvider || AUTH_PROVIDERS.SHOPIFY,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
        appointments: [],
        jewelry: []
      };

      const { db } = await connectToDatabase();
      const result = await db.collection('users').insertOne(newUser);
      
      console.log(`✅ Created new user: ${newUser.email} with role: ${newUser.role}`);
      return { ...newUser, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user's Shopify data
   */
  static async updateUserShopifyData(userID, shopifyData) {
    try {
      await connectToDatabase();
      
      const updateData = {
        'providers.shopify.id': shopifyData.shopifyId,
        'providers.shopify.customerAccessToken': shopifyData.customerAccessToken,
        'providers.shopify.lastSignIn': new Date(),
        'providers.shopify.verified': true,
        shopifyId: shopifyData.shopifyId,
        lastSignIn: new Date(),
        updatedAt: new Date()
      };

      if (shopifyData.shopifyData) {
        updateData.shopifyData = shopifyData.shopifyData;
      }

      const { db } = await connectToDatabase();
      const result = await db.collection('users').updateOne(
        { userID: userID },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('User not found');
      }

      console.log(`✅ Updated Shopify data for user: ${userID}`);
      return result;
    } catch (error) {
      console.error('Error updating user Shopify data:', error);
      throw error;
    }
  }

  /**
   * Determine if a role update should be allowed
   * Prevents downgrading admin/staff users accidentally
   */
  static shouldAllowRoleUpdate(currentRole, newRole) {
    // Define role hierarchy (higher number = more privileged)
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

    // Allow upgrades, prevent downgrades of privileged users
    if (currentLevel >= 5) { // staff, dev, admin
      return newLevel >= currentLevel; // Only allow same level or upgrades
    }
    
    // Allow any role change for non-privileged users
    return true;
  }
}

export default UnifiedUserService;