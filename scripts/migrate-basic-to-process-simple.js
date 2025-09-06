/**
 * Migration Script: Convert Basic Tasks to Process-Based Tasks
 * 
 * Run with: node scripts/migrate-basic-to-process-simple.js
 */

const { MongoClient } = require('mongodb');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efd-admin';

async function migrateBasicTasks() {
  const client = new MongoClient(MONGODB_URI);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB successfully');

    // Find basic tasks (those without processes)
    console.log('\n📊 Finding basic tasks...');
    const tasks = db.collection('tasks');
    const basicTasks = await tasks.find({
      $or: [
        { processes: { $exists: false } },
        { processes: { $eq: [] } },
        { processes: null }
      ]
    }).toArray();

    console.log(`\n📈 Found ${basicTasks.length} basic tasks:`);
    basicTasks.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title} - $${task.basePrice || 0} (${task.category})`);
    });

    if (basicTasks.length === 0) {
      console.log('\n🎉 No basic tasks found! All tasks are already process-based.');
      rl.close();
      return;
    }

    // Ask for confirmation
    const proceed = await new Promise(resolve => {
      rl.question(`\nProceed with migration? (y/n): `, answer => {
        resolve(answer.toLowerCase().trim() === 'y');
      });
    });

    if (!proceed) {
      console.log('❌ Migration cancelled');
      rl.close();
      return;
    }

    // Create generic repair process
    console.log('\n⚙️ Creating generic repair process...');
    const processes = db.collection('processes');
    const genericProcess = {
      _id: 'generic-repair-migrated',
      displayName: 'Generic Repair (Migrated)',
      processType: 'repair',
      description: 'Generic repair process for tasks migrated from basic builder',
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
      pricing: {
        laborCost: 30,
        materialCost: 0,
        totalCost: 50,
        calculatedAt: new Date().toISOString()
      },
      isGeneric: true,
      createdForMigration: true,
      createdAt: new Date().toISOString()
    };

    await processes.replaceOne(
      { _id: genericProcess._id },
      genericProcess,
      { upsert: true }
    );

    console.log('✅ Generic process created');

    // Migrate tasks
    console.log('\n🚀 Migrating tasks...\n');
    let migratedCount = 0;

    for (const task of basicTasks) {
      try {
        const updatedTask = {
          ...task,
          processes: [
            {
              processId: 'generic-repair-migrated',
              quantity: 1
            }
          ],
          materials: task.materials || [],
          originalBasicTask: {
            basePrice: task.basePrice,
            laborHours: task.laborHours,
            migratedAt: new Date().toISOString()
          },
          pricing: {
            totalLaborHours: 1.0,
            totalProcessCost: task.basePrice || 50,
            baseCost: task.basePrice || 50,
            retailPrice: (task.basePrice || 50) * 2,
            calculatedAt: new Date().toISOString()
          },
          migratedFromBasic: true,
          updatedAt: new Date().toISOString()
        };

        // Remove old fields
        delete updatedTask.basePrice;
        delete updatedTask.laborHours;

        await tasks.replaceOne({ _id: task._id }, updatedTask);
        console.log(`  ✅ Migrated: ${task.title}`);
        migratedCount++;

      } catch (error) {
        console.error(`  ❌ Failed: ${task.title} - ${error.message}`);
      }
    }

    console.log(`\n🎉 Migration complete! Migrated ${migratedCount} tasks.`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await client.close();
    rl.close();
  }
}

migrateBasicTasks();
