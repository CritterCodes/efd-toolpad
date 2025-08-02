import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME;

let client;
let db;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
  }
  return { client, db };
}

export class UserService {
  static async fetchById(userId) {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection('users');
      
      const user = await collection.findOne({ _id: userId });
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  static async getCustomerInfoForTicket(ticket) {
    try {
      if (!ticket.userID) {
        // Return default customer info if no userID
        return {
          email: 'customer@example.com',
          firstName: 'Customer',
          lastName: 'Name'
        };
      }

      const user = await this.fetchById(ticket.userID);
      
      return {
        email: user.email || 'customer@example.com',
        firstName: user.firstName || user.name?.split(' ')[0] || 'Customer',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || 'Name'
      };
    } catch (error) {
      console.error('Error getting customer info:', error);
      // Return default info if user fetch fails
      return {
        email: 'customer@example.com',
        firstName: 'Customer',
        lastName: 'Name'
      };
    }
  }
}
