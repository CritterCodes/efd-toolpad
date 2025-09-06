/**
 * Migration Script: Convert Existing Tasks to Universal Pricing Format
 * 
 * This script transforms existing tasks from hardcoded metal-specific tasks
 * to universal tasks that support all metal contexts with runtime pricing selection.
 * 
 * Run: node scripts/migrate-tasks-to-universal.js
 */

const { MongoClient, ObjectId } = require('mongodb');

class UniversalTaskMigration {
  constructor() {
    this.client = null;
    this.db = null;
    this.migrationStats = {
      totalTasks: 0,
      successfulMigrations: 0,
      skippedAlreadyUniversal: 0,
      errors: 0,
      errorTasks: []
    };
  }

  async connect() {
    try {
      this.client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/engelfinedesign');
      await this.client.connect();
      this.db = this.client.db();
      console.log('✓ Connected to MongoDB');
    } catch (error) {
      console.error('✗ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✓ Disconnected from MongoDB');
    }
  }

  /**
   * Check if task already has universal pricing structure
   */
  isUniversalTask(task) {
    return task.pricing && 
           typeof task.pricing === 'object' && 
           !Array.isArray(task.pricing) &&
           Object.keys(task.pricing).some(key => key.includes('_'));
  }

  /**
   * Extract metal context from legacy task name or structure
   */
  extractMetalContext(task) {
    const metalPatterns = {
      'gold_14k': { metalType: 'gold', karat: '14k' },
      'gold_18k': { metalType: 'gold', karat: '18k' },
      'gold_10k': { metalType: 'gold', karat: '10k' },
      'silver_sterling': { metalType: 'silver', karat: 'sterling' },
      'platinum_950': { metalType: 'platinum', karat: '950' }
    };

    // Check task name for metal patterns
    const taskName = (task.name || '').toLowerCase();
    for (const [pattern, context] of Object.entries(metalPatterns)) {
      if (taskName.includes(pattern.replace('_', ' ')) || taskName.includes(pattern)) {
        return context;
      }
    }

    // Check if task has metalType/karat properties
    if (task.metalType && task.karat) {
      return {
        metalType: task.metalType,
        karat: task.karat
      };
    }

    // Default to gold 14k if no pattern found
    console.warn(`⚠ Could not extract metal context from task "${task.name}", defaulting to gold 14k`);
    return { metalType: 'gold', karat: '14k' };
  }

  /**
   * Generate universal pricing from existing task pricing
   */
  async generateUniversalPricing(task, processes) {
    const universalPricing = {};
    const metalContext = this.extractMetalContext(task);
    
    // Get all supported metal combinations from processes
    const supportedMetals = new Set();
    
    for (const process of processes) {
      if (process.pricing && typeof process.pricing === 'object') {
        Object.keys(process.pricing).forEach(metalKey => {
          if (metalKey.includes('_')) {
            supportedMetals.add(metalKey);
          }
        });
      }
    }

    // Calculate pricing for each supported metal combination
    for (const metalKey of supportedMetals) {
      try {
        const totalCost = this.calculateTaskCostForMetal(processes, metalKey);
        if (totalCost > 0) {
          universalPricing[metalKey] = totalCost;
        }
      } catch (error) {
        console.warn(`⚠ Could not calculate pricing for ${metalKey} in task "${task.name}":`, error.message);
      }
    }

    // If we couldn't generate universal pricing from processes, use existing task pricing
    if (Object.keys(universalPricing).length === 0 && task.totalCost) {
      const originalMetalKey = `${metalContext.metalType}_${metalContext.karat}`;
      universalPricing[originalMetalKey] = task.totalCost;
      
      // Generate approximate pricing for other metals based on metal multipliers
      const metalMultipliers = {
        'gold_10k': 0.8, 'gold_14k': 1.0, 'gold_18k': 1.3,
        'silver_sterling': 0.4, 'platinum_950': 2.2
      };
      
      const baseCost = task.totalCost;
      const baseMultiplier = metalMultipliers[originalMetalKey] || 1.0;
      
      for (const [metalKey, multiplier] of Object.entries(metalMultipliers)) {
        if (metalKey !== originalMetalKey) {
          universalPricing[metalKey] = Math.round((baseCost / baseMultiplier) * multiplier * 100) / 100;
        }
      }
    }

    return universalPricing;
  }

  /**
   * Calculate task cost for specific metal from processes
   */
  calculateTaskCostForMetal(processes, metalKey) {
    let totalCost = 0;
    
    for (const process of processes) {
      if (process.pricing && process.pricing[metalKey]) {
        totalCost += process.pricing[metalKey];
      }
    }
    
    return totalCost;
  }

  /**
   * Migrate a single task to universal format
   */
  async migrateTask(task) {
    try {
      // Skip if already universal
      if (this.isUniversalTask(task)) {
        this.migrationStats.skippedAlreadyUniversal++;
        return { success: true, skipped: true };
      }

      // Get processes for this task
      const processes = await this.db.collection('processes')
        .find({ _id: { $in: (task.processes || []).map(id => new ObjectId(id)) } })
        .toArray();

      // Generate universal pricing
      const universalPricing = await this.generateUniversalPricing(task, processes);

      if (Object.keys(universalPricing).length === 0) {
        throw new Error('Could not generate universal pricing');
      }

      // Update task with universal structure
      const updateData = {
        pricing: universalPricing,
        universalTask: true,
        migrationDate: new Date(),
        supportedMetals: Object.keys(universalPricing).map(key => {
          const [metalType, karat] = key.split('_');
          return { metalType, karat };
        })
      };

      // Remove old metal-specific fields if they exist
      const unsetFields = {};
      if (task.metalType) unsetFields.metalType = '';
      if (task.karat) unsetFields.karat = '';
      if (task.totalCost !== undefined) unsetFields.totalCost = '';

      const updateQuery = { $set: updateData };
      if (Object.keys(unsetFields).length > 0) {
        updateQuery.$unset = unsetFields;
      }

      await this.db.collection('tasks').updateOne(
        { _id: task._id },
        updateQuery
      );

      this.migrationStats.successfulMigrations++;
      return { success: true, universalPricing };

    } catch (error) {
      this.migrationStats.errors++;
      this.migrationStats.errorTasks.push({
        taskId: task._id,
        taskName: task.name,
        error: error.message
      });
      
      console.error(`✗ Failed to migrate task "${task.name}" (${task._id}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run the complete migration
   */
  async migrate() {
    console.log('\n🚀 Starting Universal Task Migration...\n');

    try {
      await this.connect();

      // Get all tasks
      const tasks = await this.db.collection('tasks').find({}).toArray();
      this.migrationStats.totalTasks = tasks.length;

      console.log(`📊 Found ${tasks.length} tasks to migrate\n`);

      // Migrate each task
      for (const task of tasks) {
        const result = await this.migrateTask(task);
        
        if (result.success && !result.skipped) {
          const metalCount = Object.keys(result.universalPricing || {}).length;
          console.log(`✓ Migrated "${task.name}" (${metalCount} metal variants)`);
        } else if (result.skipped) {
          console.log(`⏭ Skipped "${task.name}" (already universal)`);
        }
      }

      // Print final statistics
      console.log('\n📈 Migration Complete!');
      console.log('═'.repeat(50));
      console.log(`Total Tasks: ${this.migrationStats.totalTasks}`);
      console.log(`Successfully Migrated: ${this.migrationStats.successfulMigrations}`);
      console.log(`Already Universal: ${this.migrationStats.skippedAlreadyUniversal}`);
      console.log(`Errors: ${this.migrationStats.errors}`);

      if (this.migrationStats.errors > 0) {
        console.log('\n❌ Tasks with Errors:');
        this.migrationStats.errorTasks.forEach(({ taskName, error }) => {
          console.log(`  • ${taskName}: ${error}`);
        });
      }

      console.log('\n🎉 Universal task migration completed successfully!');

    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new UniversalTaskMigration();
  migration.migrate().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = UniversalTaskMigration;
