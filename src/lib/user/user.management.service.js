import { connectToDatabase } from '../mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS, ROLE_PERMISSIONS } from './user.constants.js';
import { UserRoleService } from './user.role.service.js';
import { UserQueryService } from './user.query.service.js';

export class UserManagementService {
  static async initializeDatabase() {
    try {
      const { db } = await connectToDatabase();
      
      await db.collection('users').createIndex(
        { email: 1 },
        { unique: true, background: true, name: 'unique_email_index' }
      );
      console.log('✅ Created unique email index');
      
      await db.collection('users').createIndex(
        { userID: 1 },
        { unique: true, background: true, name: 'unique_userID_index' }
      );
      
      await db.collection('users').createIndex(
        { 'providers.google.id': 1 },
        { background: true, sparse: true, name: 'google_id_index' }
      );
      
      await db.collection('users').createIndex(
        { 'providers.shopify.id': 1 },
        { background: true, sparse: true, name: 'shopify_id_index' }
      );
      console.log('✅ Initialized all database indexes');
    } catch (error) {
      if (error.code === 11000) {
        console.warn('⚠️ Duplicate email index creation failed - duplicates exist in database');
        await this.cleanupDuplicateEmails();
        await this.initializeDatabase();
      } else {
        console.error('Error initializing database:', error);
        throw error;
      }
    }
  }

  static async cleanupDuplicateEmails() {
    try {
      console.log('🔄 Scanning for duplicate emails...');
      const duplicateEmails = await this.findDuplicateEmails();
      console.log(`Found ${duplicateEmails.length} emails with duplicates`);
      
      for (const emailGroup of duplicateEmails) {
        const email = emailGroup._id;
        const users = emailGroup.users;
        
        console.log(`🔄 Processing ${users.length} duplicates for ${email}`);
        const sortedUsers = users.sort((a, b) => {
          const aProviders = Object.keys(a.providers || {}).length;
          const bProviders = Object.keys(b.providers || {}).length;
          if (aProviders !== bProviders) {
            return bProviders - aProviders;
          }
          const aUpdated = new Date(a.updatedAt || a.createdAt || 0);
          const bUpdated = new Date(b.updatedAt || b.createdAt || 0);
          return bUpdated - aUpdated;
        });
        
        const preferredUser = sortedUsers[0];
        const duplicateUsers = sortedUsers.slice(1);
        
        await this.mergeDuplicateUsers(preferredUser, duplicateUsers);
      }
      
      console.log('✅ Completed duplicate email cleanup');
    } catch (error) {
      console.error('Error cleaning up duplicate emails:', error);
      throw error;
    }
  }

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
          $match: { count: { $gt: 1 } }
        }
      ]).toArray();
    } catch (error) {
      console.error('Error finding duplicate emails:', error);
      throw error;
    }
  }

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
      
      for (const duplicate of duplicateUsers) {
        if (duplicate.providers) {
          Object.entries(duplicate.providers).forEach(([provider, data]) => {
            if (!mergeData.providers[provider] || !mergeData.providers[provider].verified) {
              mergeData.providers[provider] = data;
              console.log(`✅ Merged ${provider} provider data from duplicate user`);
            }
          });
        }
        
        if (!preferredUser.firstName && duplicate.firstName) mergeData.firstName = duplicate.firstName;
        if (!preferredUser.lastName && duplicate.lastName) mergeData.lastName = duplicate.lastName;
        if (!preferredUser.phoneNumber && duplicate.phoneNumber) mergeData.phoneNumber = duplicate.phoneNumber;
      }
      
      await db.collection('users').updateOne(
        { userID: preferredUser.userID },
        { $set: mergeData }
      );
      
      const duplicateIds = duplicateUsers.map(u => u.userID);
      await db.collection('users').deleteMany({
        userID: { $in: duplicateIds }
      });
      console.log(`✅ Removed ${duplicateUsers.length} duplicate users: ${duplicateIds.join(', ')}`);
    } catch (error) {
      console.error('Error merging duplicate users:', error);
    }
  }

  static async createOrUpdateUser(shopifyCustomer, additionalData = {}) {
    try {
      const { db } = await connectToDatabase();
      const existingUser = await UserQueryService.findUserByShopifyId(shopifyCustomer.id);
      
      if (existingUser) {
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
        return await UserQueryService.findUserByShopifyId(shopifyCustomer.id);
      } else {
        const newUser = {
          userID: uuidv4(),
          shopifyId: shopifyCustomer.id,
          firstName: shopifyCustomer.firstName,
          lastName: shopifyCustomer.lastName,
          email: shopifyCustomer.email,
          phoneNumber: shopifyCustomer.phone,
          role: additionalData.role || USER_ROLES.CLIENT,
          status: UserRoleService.getDefaultStatusForRole(additionalData.role || USER_ROLES.CLIENT),
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
          approvalData: UserRoleService.requiresApproval(additionalData.role || USER_ROLES.CLIENT) ? {
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

      if (result.matchedCount === 0) throw new Error('User not found');
      console.log(`✅ Updated Shopify data for user: ${userID}`);
      return result;
    } catch (error) {
      console.error('Error updating user Shopify data:', error);
      throw error;
    }
  }
}
