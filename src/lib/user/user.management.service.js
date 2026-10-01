import { db as mongo } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS } from './user.constants.js';

export class UserManagementService {
  static async initializeDatabase() {
    try {
      const db = await mongo.connect();
      
      await db.collection('users').createIndex(
        { email: 1 },
        { unique: true, background: true, name: 'unique_email_index' }
      );
      
      await db.collection('users').createIndex(
        { userID: 1 },
        { unique: true, background: true, name: 'unique_userID_index' }
      );
      
      await db.collection('users').createIndex(
        { 'providers.google.id': 1 },
        { background: true, sparse: true, name: 'google_id_index' }
      );
      
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
      const duplicateEmails = await this.findDuplicateEmails();
      
      for (const emailGroup of duplicateEmails) {
        const users = emailGroup.users;
        
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
      
    } catch (error) {
      console.error('Error cleaning up duplicate emails:', error);
      throw error;
    }
  }

  static async findDuplicateEmails() {
    try {
      const db = await mongo.connect();
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
      const db = await mongo.connect();
      if (duplicateUsers.length === 0) return;
      
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
    } catch (error) {
      console.error('Error merging duplicate users:', error);
    }
  }

  static async createUser(userData) {
    try {
      await mongo.connect();
      const newUser = {
        userID: userData.userID || `user-${uuidv4().substring(0, 8)}`,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role || USER_ROLES.CLIENT,
        status: userData.status || USER_STATUS.PENDING,
        phoneNumber: userData.phoneNumber || '',
        address: userData.address || {},
        providers: userData.providers || {},
        primaryProvider: userData.primaryProvider || AUTH_PROVIDERS.EMAIL,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
        appointments: [],
        jewelry: []
      };

      const db = await mongo.connect();
      const result = await db.collection('users').insertOne(newUser);
      return { ...newUser, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}
