/**
 * Database Service - Database Connection Management
 * Constitutional Architecture: Database Layer
 * Responsibility: Database connection and collection access
 */

import { MongoClient } from 'mongodb';

// Constitutional embedded logger fallback for Next.js bundling
let logger;
try {
  logger = require('../utils/logger.js');
} catch (error) {
  // Fallback logger for Next.js embedded mode
  logger = {
    error: (message, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    warn: (message, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    info: (message, meta = {}) => console.info(`[INFO] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    debug: (message, meta = {}) => console.debug(`[DEBUG] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
  };
}

export class DatabaseService {
  static db = null;

  /**
   * Initialize database connection
   */
  static async initializeDatabase() {
    try {
      const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/efd-admin';
      const client = new MongoClient(connectionString);
      await client.connect();
      
      // Use the same database name as the main application
      const dbName = process.env.MONGO_DB_NAME || 'efd-database';
      this.db = client.db(dbName);
      
      logger.info(`Database connected successfully to: ${dbName}`);
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Get database collection
   */
  static getCollection(collectionName = 'custom_tickets') {
    if (!this.db) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return this.db.collection(collectionName);
  }

  /**
   * Get users collection
   */
  static getUsersCollection() {
    return this.getCollection('users');
  }

  /**
   * Get custom tickets collection
   */
  static getTicketsCollection() {
    return this.getCollection('customTickets');
  }
}

export default DatabaseService;