const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Repair Task Migration Script - Transform v1.0 to v2.0 schema
 * Converts existing Shopify-synced repair tasks to new business-focused schema
 */
class RepairTaskMigrationService {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.migrationStats = {
      processed: 0,
      successful: 0,
      errors: []
    };
    
    // Track used shortCodes to ensure uniqueness
    this.usedShortCodes = new Set();
    
    // Category mapping from analysis
    this.categoryMapping = {
      'shank': { code: '0', name: 'SHANK' },
      'prongs': { code: '1', name: 'PRONG' },
      'stone_setting': { code: '2', name: 'STONE' },
      'engraving': { code: '3', name: 'ENGRAVE' },
      'chains': { code: '4', name: 'CHAIN' },
      'bracelet': { code: '5', name: 'BRACELET' },
      'watch': { code: '6', name: 'WATCH' },
      'misc': { code: '7', name: 'MISC' }
    };
    
    // Metal type mapping
    this.metalMapping = {
      'ss': { karat: '1', type: '1', name: 'silver' },      // Silver
      '14yg': { karat: '2', type: '2', name: 'gold' },      // 14k Yellow Gold
      '14wg': { karat: '2', type: '3', name: 'gold' },      // 14k White Gold
      '18yg': { karat: '3', type: '2', name: 'gold' },      // 18k Yellow Gold
      '18wg': { karat: '3', type: '3', name: 'gold' }       // 18k White Gold
    };
    
    // Default business data by category
    this.categoryDefaults = {
      'shank': {
        laborHours: 1.0,
        materialCost: 15.00,
        estimatedDays: 3,
        rushDays: 1,
        skillLevel: 'standard',
        riskLevel: 'low',
        departments: ['workshop'],
        equipmentNeeded: ['sizing_mandrel', 'torch', 'files'],
        requiresMetalType: true
      },
      'prongs': {
        laborHours: 0.75,
        materialCost: 8.00,
        estimatedDays: 2,
        rushDays: 1,
        skillLevel: 'standard',
        riskLevel: 'medium',
        departments: ['workshop'],
        equipmentNeeded: ['microscope', 'prong_pusher', 'files'],
        requiresMetalType: true
      },
      'stone_setting': {
        laborHours: 1.25,
        materialCost: 5.00,
        estimatedDays: 3,
        rushDays: 2,
        skillLevel: 'advanced',
        riskLevel: 'high',
        departments: ['workshop', 'stone_setting'],
        equipmentNeeded: ['microscope', 'setting_tools', 'burnisher'],
        requiresMetalType: true
      },
      'chains': {
        laborHours: 0.50,
        materialCost: 10.00,
        estimatedDays: 2,
        rushDays: 1,
        skillLevel: 'standard',
        riskLevel: 'low',
        departments: ['workshop'],
        equipmentNeeded: ['torch', 'chain_pliers'],
        requiresMetalType: false
      },
      'misc': {
        laborHours: 0.25,
        materialCost: 3.00,
        estimatedDays: 1,
        rushDays: 1,
        skillLevel: 'standard',
        riskLevel: 'low',
        departments: ['finishing'],
        equipmentNeeded: ['polishing_wheel', 'compounds'],
        requiresMetalType: false
      }
    };
  }

  async connect() {
    try {
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      const dbName = process.env.MONGO_DB_NAME || 'efd-database';
      this.db = this.mongoClient.db(dbName);
      console.log(`✅ Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log('📦 MongoDB connection closed');
    }
  }

  /**
   * Main migration function
   */
  async migrateRepairTasks() {
    try {
      console.log('🚀 Starting repair task migration to v2.0 schema...');
      
      // Get existing tasks
      const collection = this.db.collection('repairTasks');
      const oldTasks = await collection.find({}).toArray();
      console.log(`📊 Found ${oldTasks.length} tasks to migrate`);
      
      // Create backup collection
      await this.createBackup(oldTasks);
      
      // Transform each task
      const newTasks = [];
      for (const oldTask of oldTasks) {
        try {
          const newTask = await this.transformTask(oldTask);
          newTasks.push(newTask);
          this.migrationStats.successful++;
        } catch (error) {
          console.error(`❌ Error transforming task ${oldTask._id}:`, error.message);
          this.migrationStats.errors.push({
            taskId: oldTask._id,
            sku: oldTask.sku,
            error: error.message
          });
        }
        this.migrationStats.processed++;
      }
      
      // Create new collection for v2.0 tasks
      await this.storeNewTasks(newTasks);
      
      console.log('✅ Migration completed successfully!');
      this.printMigrationSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Transform old task to new v2.0 schema
   */
  async transformTask(oldTask) {
    const category = this.inferCategory(oldTask);
    const metalInfo = this.extractMetalInfo(oldTask.sku);
    const shortCode = this.generateShortCode(category, metalInfo, oldTask);
    const defaults = this.categoryDefaults[category] || this.categoryDefaults['misc'];
    
    const newTask = {
      // Core Identification
      _id: oldTask._id,
      sku: this.generateNewSKU(category, shortCode),
      shortCode: shortCode,
      title: oldTask.title || 'Untitled Repair Task',
      description: oldTask.description || '',
      
      // Service Classification
      category: category,
      subcategory: this.generateSubcategory(oldTask.title, category),
      metalType: metalInfo.name,
      requiresMetalType: defaults.requiresMetalType,
      
      // Core Pricing Components
      laborHours: defaults.laborHours,
      materialCost: defaults.materialCost,
      basePrice: null, // Will be calculated
      
      // Service Details
      service: {
        estimatedDays: defaults.estimatedDays,
        rushDays: defaults.rushDays,
        rushMultiplier: 1.5,
        requiresApproval: false,
        requiresInspection: true,
        canBeBundled: true,
        skillLevel: defaults.skillLevel,
        riskLevel: defaults.riskLevel
      },
      
      // Workflow Integration
      workflow: {
        departments: defaults.departments,
        equipmentNeeded: defaults.equipmentNeeded,
        qualityChecks: ['measurement', 'fit', 'finish'],
        safetyRequirements: ['protective_gear']
      },
      
      // Size/Quantity Constraints
      constraints: {
        minQuantity: 1,
        maxQuantity: 10,
        sizeRange: category === 'shank' ? { min: 4, max: 13 } : null,
        weightLimits: { minGrams: null, maxGrams: null }
      },
      
      // Display & Organization
      display: {
        isActive: oldTask.status === 'ACTIVE',
        isFeatured: false,
        sortOrder: 100,
        tags: oldTask.tags || [],
        icon: this.getCategoryIcon(category),
        color: this.getCategoryColor(category),
        thumbnailUrl: this.extractThumbnail(oldTask.images)
      },
      
      // Shopify Integration (initialize for new products)
      shopify: {
        productId: null,
        variantId: null,
        needsSync: true,
        lastSyncedAt: null,
        shopifyPrice: 0
      },
      
      // Pricing History & Analytics
      analytics: {
        originalPrice: oldTask.price || 0,
        timesUsed: 0,
        averageCompletionTime: null,
        customerSatisfactionScore: null,
        lastUsed: null,
        seasonalDemand: {},
        profitMargin: null
      },
      
      // Metadata
      createdAt: oldTask.shopifyCreatedAt || new Date(),
      updatedAt: oldTask.shopifyUpdatedAt || new Date(),
      createdBy: 'migration-script',
      lastModifiedBy: 'migration-script',
      version: 2,
      isArchived: false,
      archivedAt: null,
      archivedReason: null
    };
    
    return newTask;
  }

  /**
   * Infer category from old task data
   */
  inferCategory(task) {
    const title = (task.title || '').toLowerCase();
    const tags = (task.tags || []).join(' ').toLowerCase();
    const sku = (task.sku || '').toLowerCase();
    const content = `${title} ${tags} ${sku}`;
    
    if (content.includes('size') || content.includes('shank') || content.includes('szdn') || content.includes('szup')) return 'shank';
    if (content.includes('prong') || content.includes('tip') || content.includes('straighten')) return 'prongs';
    if (content.includes('stone') || content.includes('setting') || content.includes('set')) return 'stone_setting';
    if (content.includes('chain') || content.includes('jump') || content.includes('link')) return 'chains';
    if (content.includes('engrave') || content.includes('inscribe')) return 'engraving';
    if (content.includes('bracelet') || content.includes('bangle')) return 'bracelet';
    if (content.includes('watch') || content.includes('battery')) return 'watch';
    
    return 'misc';
  }

  /**
   * Extract metal information from SKU
   */
  extractMetalInfo(sku) {
    const skuLower = (sku || '').toLowerCase();
    
    // Check for metal codes in SKU
    for (const [code, info] of Object.entries(this.metalMapping)) {
      if (skuLower.includes(code)) {
        return info;
      }
    }
    
    // Default to not applicable
    return { karat: '0', type: '0', name: null };
  }

  /**
   * Generate new shortCode in format: [category][karat][metal][task]
   * Ensures uniqueness by incrementing task code if needed
   */
  generateShortCode(category, metalInfo, oldTask) {
    const categoryCode = this.categoryMapping[category]?.code || '7';
    const karatCode = metalInfo.karat;
    const metalTypeCode = metalInfo.type;
    
    // Generate base task code based on task specifics
    let baseTaskCode = '01'; // Default
    
    const title = (oldTask.title || '').toLowerCase();
    const sku = (oldTask.sku || '').toLowerCase();
    
    // Shank task codes
    if (category === 'shank') {
      if (sku.includes('szdn')) baseTaskCode = '01'; // Size down
      else if (sku.includes('szup')) baseTaskCode = '02'; // Size up
      else if (sku.includes('adsize')) baseTaskCode = '03'; // Additional size
      else if (sku.includes('halfshk')) baseTaskCode = '06'; // Half shank
      else if (sku.includes('sldrgsto')) baseTaskCode = '07'; // Solder together
      else if (sku.includes('sldbrshk')) baseTaskCode = '08'; // Solder break
      else if (sku.includes('sizingbd')) baseTaskCode = '09'; // Sizing beads
      else if (sku.includes('reshape')) baseTaskCode = '10'; // Reshape
    }
    // Prong task codes
    else if (category === 'prongs') {
      if (sku.includes('tips')) baseTaskCode = '10'; // Tips
      else if (sku.includes('addtips')) baseTaskCode = '11'; // Additional tips
      else if (sku.includes('rbprong')) baseTaskCode = '12'; // Rebuild prong
      else if (sku.includes('strprng')) baseTaskCode = '13'; // Straighten prongs
    }
    // Stone setting task codes
    else if (category === 'stone_setting') {
      if (sku.includes('setstone')) baseTaskCode = '20'; // Set stone
      else if (sku.includes('removestone')) baseTaskCode = '21'; // Remove stone
      else if (sku.includes('chktighten')) baseTaskCode = '22'; // Check and tighten
    }
    // Chain task codes
    else if (category === 'chains') {
      if (sku.includes('breakinchain')) baseTaskCode = '40'; // Break in chain
      else if (sku.includes('addjumpring')) baseTaskCode = '41'; // Add jump ring
      else if (sku.includes('sldrjumpring')) baseTaskCode = '42'; // Solder jump ring
    }
    // Misc task codes
    else if (category === 'misc') {
      if (sku.includes('clnpolish')) baseTaskCode = '70'; // Clean and polish
      else if (sku.includes('restring')) baseTaskCode = '71'; // Restring
      else if (sku.includes('redrill')) baseTaskCode = '72'; // Redrill
    }
    
    // Ensure uniqueness by incrementing if needed
    let taskCode = baseTaskCode;
    let shortCode = `${categoryCode}${karatCode}${metalTypeCode}${taskCode}`;
    let counter = 1;
    
    while (this.usedShortCodes.has(shortCode)) {
      // Increment task code
      const nextTaskNum = parseInt(baseTaskCode) + counter;
      taskCode = nextTaskNum.toString().padStart(2, '0');
      shortCode = `${categoryCode}${karatCode}${metalTypeCode}${taskCode}`;
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 99) {
        taskCode = Math.floor(Math.random() * 90 + 10).toString();
        shortCode = `${categoryCode}${karatCode}${metalTypeCode}${taskCode}`;
        break;
      }
    }
    
    // Mark this shortCode as used
    this.usedShortCodes.add(shortCode);
    
    return shortCode;
  }

  /**
   * Generate new SKU format: RT-[CATEGORY]-[shortCode]
   */
  generateNewSKU(category, shortCode) {
    const categoryName = this.categoryMapping[category]?.name || 'MISC';
    return `RT-${categoryName}-${shortCode}`;
  }

  /**
   * Generate subcategory from title and category
   */
  generateSubcategory(title, category) {
    const titleLower = (title || '').toLowerCase();
    
    if (category === 'shank') {
      if (titleLower.includes('size down')) return 'size_down';
      if (titleLower.includes('size up')) return 'size_up';
      if (titleLower.includes('half-shank')) return 'half_shank';
      if (titleLower.includes('solder')) return 'solder_repair';
      return 'ring_sizing';
    }
    
    if (category === 'prongs') {
      if (titleLower.includes('tips')) return 'prong_tips';
      if (titleLower.includes('rebuild')) return 'prong_rebuild';
      if (titleLower.includes('straighten')) return 'prong_straighten';
      return 'prong_repair';
    }
    
    if (category === 'stone_setting') {
      if (titleLower.includes('set stone')) return 'stone_setting';
      if (titleLower.includes('remove')) return 'stone_removal';
      if (titleLower.includes('tighten')) return 'stone_tightening';
      return 'stone_work';
    }
    
    return `${category}_general`;
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category) {
    const icons = {
      'shank': 'resize',
      'prongs': 'grip-vertical',
      'stone_setting': 'gem',
      'engraving': 'edit',
      'chains': 'link',
      'bracelet': 'circle',
      'watch': 'clock',
      'misc': 'tool'
    };
    return icons[category] || 'tool';
  }

  /**
   * Get category color
   */
  getCategoryColor(category) {
    const colors = {
      'shank': '#4A90E2',      // Blue
      'prongs': '#7ED321',     // Green
      'stone_setting': '#9013FE', // Purple
      'engraving': '#FF6900',  // Orange
      'chains': '#ABB8C3',     // Gray
      'bracelet': '#F5A623',   // Yellow
      'watch': '#BD10E0',      // Magenta
      'misc': '#50E3C2'        // Teal
    };
    return colors[category] || '#ABB8C3';
  }

  /**
   * Extract thumbnail from images array
   */
  extractThumbnail(images) {
    if (images && images.length > 0 && images[0].url) {
      return images[0].url;
    }
    return null;
  }

  /**
   * Create backup of old tasks
   */
  async createBackup(oldTasks) {
    try {
      const backupCollection = this.db.collection('repairTasks_v1_backup');
      
      // Drop existing backup collection if it exists
      try {
        await backupCollection.drop();
        console.log('🗑️ Dropped existing backup collection');
      } catch (error) {
        // Collection doesn't exist, which is fine
      }
      
      if (oldTasks.length > 0) {
        await backupCollection.insertMany(oldTasks);
        console.log(`💾 Created backup of ${oldTasks.length} tasks in 'repairTasks_v1_backup'`);
      }
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Store new tasks in v2.0 collection
   */
  async storeNewTasks(newTasks) {
    try {
      // Drop old collection and create new one
      await this.db.collection('repairTasks').drop();
      console.log('🗑️  Dropped old repairTasks collection');
      
      const collection = this.db.collection('repairTasks');
      
      // Create indexes for new schema
      await collection.createIndex({ sku: 1 }, { unique: true });
      await collection.createIndex({ shortCode: 1 }, { unique: true });
      await collection.createIndex({ category: 1 });
      await collection.createIndex({ metalType: 1 });
      await collection.createIndex({ 'display.isActive': 1 });
      await collection.createIndex({ title: 'text', description: 'text' });
      console.log('📊 Created indexes for v2.0 schema');
      
      // Insert new tasks
      if (newTasks.length > 0) {
        await collection.insertMany(newTasks);
        console.log(`✅ Inserted ${newTasks.length} tasks with v2.0 schema`);
      }
      
    } catch (error) {
      console.error('❌ Failed to store new tasks:', error);
      throw error;
    }
  }

  /**
   * Print migration summary
   */
  printMigrationSummary() {
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`📈 Tasks Processed: ${this.migrationStats.processed}`);
    console.log(`✅ Successful Migrations: ${this.migrationStats.successful}`);
    console.log(`❌ Errors: ${this.migrationStats.errors.length}`);
    
    if (this.migrationStats.errors.length > 0) {
      console.log('\n❌ ERRORS DETAILS:');
      this.migrationStats.errors.forEach(error => {
        console.log(`   Task: ${error.sku} (${error.taskId})`);
        console.log(`   Error: ${error.error}`);
      });
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review migrated tasks in database');
    console.log('2. Run admin settings initialization');
    console.log('3. Calculate prices using new formula');
    console.log('4. Create new Shopify products');
    console.log('');
  }
}

// Run the migration
async function runMigration() {
  const migrationService = new RepairTaskMigrationService();
  
  try {
    await migrationService.connect();
    await migrationService.migrateRepairTasks();
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await migrationService.disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = RepairTaskMigrationService;
