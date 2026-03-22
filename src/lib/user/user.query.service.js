import { connectToDatabase } from '../mongodb.js';
import { UserManagementService } from './user.management.service.js';

export class UserQueryService {
  static async findUserByEmail(email) {
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ 
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findUsersByEmail(email) {
    try {
      const { db } = await connectToDatabase();
      const users = await db.collection('users').find({ 
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).toArray();
      return users;
    } catch (error) {
      console.error('Error finding users by email:', error);
      throw error;
    }
  }

  static async findUserByEmailSafe(email) {
    try {
      const users = await this.findUsersByEmail(email);
      
      if (users.length === 0) {
        return null;
      }
      
      if (users.length === 1) {
        return users[0];
      }
      
      console.warn(`🔄 Found ${users.length} duplicate users for email: ${email}`);
      
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
      console.log(`✅ Selected user ${preferredUser.userID} as preferred from ${users.length} duplicates`);
      
      await UserManagementService.mergeDuplicateUsers(preferredUser, sortedUsers.slice(1));
      
      return preferredUser;
    } catch (error) {
      console.error('Error finding user by email safely:', error);
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
}
