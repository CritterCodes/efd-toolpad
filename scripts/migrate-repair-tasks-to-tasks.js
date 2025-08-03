#!/usr/bin/env node

/**
 * Migrate repairTasks collection to tasks collection
 * This script renames the collection and updates any references
 */

const { MongoClient } = require('mongodb');

class TasksMigrationService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const connectionString = 'mongodb://localhost:27017';
      const dbName = 'efd-crm';
      
      this.client = new MongoClient(connectionString);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB connection closed');
    }
  }

  /**
   * Migrate repairTasks collection to tasks
   */
  async migrateRepairTasksToTasks() {
    try {
      console.log('🔄 Starting repairTasks → tasks migration...');

      // Check if repairTasks collection exists
      const collections = await this.db.listCollections().toArray();
      const repairTasksExists = collections.some(col => col.name === 'repairTasks');
      const tasksExists = collections.some(col => col.name === 'tasks');

      if (!repairTasksExists) {
        console.log('⚠️  repairTasks collection does not exist. Nothing to migrate.');
        return;
      }

      if (tasksExists) {
        console.log('⚠️  tasks collection already exists. Checking if we should merge...');
        
        const tasksCount = await this.db.collection('tasks').countDocuments();
        const repairTasksCount = await this.db.collection('repairTasks').countDocuments();
        
        console.log(`📊 Current state:`);
        console.log(`   - repairTasks: ${repairTasksCount} documents`);
        console.log(`   - tasks: ${tasksCount} documents`);

        // If tasks collection is empty, we can safely rename
        if (tasksCount === 0) {
          console.log('✅ tasks collection is empty, safe to migrate');
        } else {
          console.log('⚠️  tasks collection has data. Manual review required.');
          return;
        }
      }

      // Rename the collection
      console.log('🔄 Renaming repairTasks → tasks...');
      await this.db.collection('repairTasks').rename('tasks');

      // Verify the migration
      const finalTasksCount = await this.db.collection('tasks').countDocuments();
      console.log(`✅ Migration completed! tasks collection now has ${finalTasksCount} documents`);

      // Create backup collection name reference
      const backupInfo = {
        originalCollection: 'repairTasks',
        migratedTo: 'tasks',
        migratedAt: new Date(),
        documentCount: finalTasksCount
      };

      await this.db.collection('migrationLog').insertOne(backupInfo);
      console.log('📝 Migration logged for future reference');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create indexes for the new tasks collection
   */
  async createTasksIndexes() {
    try {
      console.log('🔄 Creating indexes for tasks collection...');

      const collection = this.db.collection('tasks');

      // Create indexes
      await Promise.all([
        collection.createIndex({ title: 1 }, { unique: true }),
        collection.createIndex({ category: 1 }),
        collection.createIndex({ metalType: 1 }),
        collection.createIndex({ isActive: 1 }),
        collection.createIndex({ basePrice: 1 }),
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ 'title': 'text', 'description': 'text' })
      ]);

      console.log('✅ Indexes created successfully');

    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      throw error;
    }
  }

  /**
   * Update any documents that reference repairTasks
   */
  async updateReferences() {
    try {
      console.log('🔄 Updating collection references...');

      // Check for any documents that might reference repairTasks
      const collections = ['repairs', 'customTickets', 'orders'];
      
      for (const collectionName of collections) {
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          console.log(`📋 Checking ${collectionName} for repairTasks references...`);
          
          // This would depend on your specific schema
          // Example: Update any field that references repairTasks
          const result = await collection.updateMany(
            { 'repairTasks': { $exists: true } },
            { $rename: { 'repairTasks': 'tasks' } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`   ✅ Updated ${result.modifiedCount} documents in ${collectionName}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to update references:', error);
      throw error;
    }
  }

  /**
   * Run the complete migration
   */
  async runMigration() {
    try {
      await this.connect();
      
      await this.migrateRepairTasksToTasks();
      await this.createTasksIndexes();
      await this.updateReferences();
      
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Update your application code to use /api/tasks instead of /api/repair-tasks');
      console.log('2. Test the new endpoints');
      console.log('3. Update any remaining references in your codebase');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrationService = new TasksMigrationService();
  migrationService.runMigration();
}

module.exports = TasksMigrationService;
