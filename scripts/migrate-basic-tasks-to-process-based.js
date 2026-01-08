#!/usr/bin/env node

/**
 * Migration Script: Convert Basic Tasks to Process-Based Tasks
 * 
 * This script identifies basic tasks (those without processes) and converts them
 * to use the process-based structure for consistency and better pricing.
 */

import { MongoClient } from 'mongodb';
import readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efd-admin';

class BasicTaskMigrator {
  constructor() {
    this.client = null;
    this.db = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async connect() {
    try {
      console.log('🔗 Connecting to MongoDB...');
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
    this.rl.close();
  }

  async findBasicTasks() {
    console.log('\n📊 Analyzing existing tasks...');
    
    const tasks = this.db.collection('tasks');
    
    // Find tasks that don't have processes array (basic tasks)
    const basicTasks = await tasks.find({
      $or: [
        { processes: { $exists: false } },
        { processes: { $eq: [] } },
        { processes: null }
      ]
    }).toArray();

    console.log(`\n📈 Found ${basicTasks.length} basic tasks that need migration:`);
    
    basicTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - $${task.basePrice || 0} (${task.category})`);
    });

    return basicTasks;
  }

  async createGenericProcesses() {
    console.log('\n⚙️ Creating generic processes for basic task migration...');
    
    const processes = this.db.collection('processes');
    
    // Generic processes to map basic tasks to
    const genericProcesses = [
      {
        _id: 'generic-repair-basic',
        displayName: 'Basic Repair Work',
        processType: 'repair',
        description: 'Generic repair process for migrated basic tasks',
        laborHours: 1.0,
        skillLevel: 'standard',
        riskLevel: 'low',
        metalComplexity: {
          yellow_gold: 1.0,
          white_gold: 1.1,
          rose_gold: 1.05,
          silver: 0.9,
          platinum: 1.3,
          mixed: 1.2,
          n_a: 1.0
        },
        materials: [],
        isGeneric: true,
        createdForMigration: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'generic-sizing-basic',
        displayName: 'Basic Sizing Work',
        processType: 'sizing',
        description: 'Generic sizing process for migrated basic tasks',
        laborHours: 0.75,
        skillLevel: 'standard',
        riskLevel: 'medium',
        metalComplexity: {
          yellow_gold: 1.0,
          white_gold: 1.2,
          rose_gold: 1.1,
          silver: 0.8,
          platinum: 1.4,
          mixed: 1.3,
          n_a: 1.0
        },
        materials: [],
        isGeneric: true,
        createdForMigration: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'generic-stone-work-basic',
        displayName: 'Basic Stone Work',
        processType: 'stone_work',
        description: 'Generic stone work process for migrated basic tasks',
        laborHours: 1.5,
        skillLevel: 'advanced',
        riskLevel: 'high',
        metalComplexity: {
          yellow_gold: 1.0,
          white_gold: 1.1,
          rose_gold: 1.05,
          silver: 0.9,
          platinum: 1.2,
          mixed: 1.15,
          n_a: 1.0
        },
        materials: [],
        isGeneric: true,
        createdForMigration: true,
        createdAt: new Date().toISOString()
      }
    ];

    // Create processes if they don't exist
    for (const process of genericProcesses) {
      await processes.replaceOne(
        { _id: process._id },
        process,
        { upsert: true }
      );
    }

    console.log('✅ Created/updated generic processes for migration');
    return genericProcesses;
  }

  async calculateProcessPricing(process, task, adminSettings) {
    // Calculate pricing based on the task's original pricing
    const baseLaborRate = adminSettings?.pricing?.wage || 30;
    const materialMarkup = adminSettings?.pricing?.materialMarkup || 1.5;
    
    const laborCost = process.laborHours * baseLaborRate;
    const materialCost = 0; // No materials for basic processes
    const markedUpMaterials = materialCost * materialMarkup;
    
    // Try to reverse-engineer what the total cost should be from the task's basePrice
    const targetPrice = task.basePrice || laborCost;
    
    return {
      laborCost,
      materialCost,
      markedUpMaterials,
      totalCost: Math.max(targetPrice, laborCost), // Use whichever is higher
      baseMaterialsCost: materialCost,
      calculatedAt: new Date().toISOString()
    };
  }

  async migrateTask(task, genericProcesses, adminSettings) {
    console.log(`\n🔄 Migrating task: ${task.title}`);
    
    // Map category to appropriate generic process
    let selectedProcess;
    if (task.category === 'sizing') {
      selectedProcess = genericProcesses.find(p => p._id === 'generic-sizing-basic');
    } else if (task.category === 'stone_work') {
      selectedProcess = genericProcesses.find(p => p._id === 'generic-stone-work-basic');
    } else {
      selectedProcess = genericProcesses.find(p => p._id === 'generic-repair-basic');
    }

    // Calculate pricing for the selected process
    const processPricing = await this.calculateProcessPricing(selectedProcess, task, adminSettings);
    
    // Update the process with calculated pricing
    selectedProcess.pricing = processPricing;

    // Convert basic task to process-based structure
    const updatedTask = {
      ...task,
      processes: [
        {
          processId: selectedProcess._id,
          quantity: 1
        }
      ],
      materials: task.materials || [], // Keep existing materials if any
      // Preserve original data for reference
      originalBasicTask: {
        basePrice: task.basePrice,
        laborHours: task.laborHours,
        migratedAt: new Date().toISOString()
      },
      // Add process-based pricing information
      pricing: {
        totalLaborHours: selectedProcess.laborHours,
        totalProcessCost: processPricing.totalCost,
        totalMaterialCost: 0,
        markedUpMaterialCost: 0,
        baseCost: processPricing.totalCost,
        retailPrice: processPricing.totalCost * (adminSettings?.pricing?.businessMultiplier || 2.0),
        wholesalePrice: processPricing.totalCost * (adminSettings?.pricing?.wholesaleMultiplier || 1.5),
        businessMultiplier: adminSettings?.pricing?.businessMultiplier || 2.0,
        adminSettings: adminSettings,
        calculatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString(),
      migratedFromBasic: true
    };

    // Remove old basic-only fields
    delete updatedTask.basePrice;
    delete updatedTask.laborHours;

    return { updatedTask, selectedProcess };
  }

  async promptUser(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  async run() {
    try {
      await this.connect();

      // Find basic tasks
      const basicTasks = await this.findBasicTasks();
      
      if (basicTasks.length === 0) {
        console.log('\n🎉 No basic tasks found! All tasks are already process-based.');
        return;
      }

      // Ask for confirmation
      const proceed = await this.promptUser(`\nDo you want to proceed with migrating ${basicTasks.length} tasks? (y/n): `);
      
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log('❌ Migration cancelled by user');
        return;
      }

      // Create generic processes
      const genericProcesses = await this.createGenericProcesses();

      // Load admin settings
      console.log('\n📋 Loading admin settings...');
      const adminSettingsCollection = this.db.collection('adminSettings');
      const adminSettings = await adminSettingsCollection.findOne({});
      console.log('✅ Admin settings loaded');

      // Migrate each task
      const tasks = this.db.collection('tasks');
      const processes = this.db.collection('processes');
      let migratedCount = 0;
      let errorCount = 0;

      console.log('\n🚀 Starting migration...\n');

      for (const task of basicTasks) {
        try {
          const { updatedTask, selectedProcess } = await this.migrateTask(task, genericProcesses, adminSettings);
          
          // Update the process with pricing
          await processes.updateOne(
            { _id: selectedProcess._id },
            { $set: { pricing: selectedProcess.pricing } }
          );

          // Update the task
          await tasks.replaceOne(
            { _id: task._id },
            updatedTask
          );

          console.log(`  ✅ ${task.title} → ${selectedProcess.displayName}`);
          migratedCount++;

        } catch (error) {
          console.error(`  ❌ Failed to migrate ${task.title}:`, error.message);
          errorCount++;
        }
      }

      console.log('\n🎉 Migration completed!');
      console.log(`✅ Successfully migrated: ${migratedCount} tasks`);
      if (errorCount > 0) {
        console.log(`❌ Failed migrations: ${errorCount} tasks`);
      }

      // Summary
      console.log('\n📊 Migration Summary:');
      console.log('- All migrated tasks now use process-based structure');
      console.log('- Original pricing data preserved in `originalBasicTask` field');
      console.log('- Generic processes created with appropriate pricing');
      console.log('- Process-based pricing calculations applied');

    } catch (error) {
      console.error('💥 Migration failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new BasicTaskMigrator();
  migrator.run().catch(console.error);
}

export default BasicTaskMigrator;
