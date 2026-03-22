import { connectToDatabase } from '../mongodb.js';

export class UserAssociationService {
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
      
      if (result.matchedCount === 0) throw new Error('User not found');
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
      
      if (result.matchedCount === 0) throw new Error('User not found');
      return result;
    } catch (error) {
      console.error('Error adding jewelry:', error);
      throw error;
    }
  }
}
