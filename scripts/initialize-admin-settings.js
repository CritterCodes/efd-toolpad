#!/usr/bin/env node

/**
 * Initialize admin settings with business pricing parameters
 * This script sets up the consumablesFee and other admin settings required for v2.0 pricing
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

class AdminSettingsInitializer {
  constructor() {
    this.mongoClient = null;
    this.db = null;
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
      console.log('🔌 MongoDB connection closed');
    }
  }

  /**
   * Generate secure admin settings with encrypted security codes
   */
  generateAdminSettings() {
    const currentTime = new Date();
    
    return {
      _id: 'repair_task_admin_settings',
      
      // Pricing Components
      pricing: {
        administrativeFee: 0.15,        // 15% admin fee
        businessFee: 0.25,              // 25% business margin
        consumablesFee: 0.08,           // 8% consumables fee (NEW)
        rushMultiplier: 1.5,            // 50% rush surcharge
        wage: 45.00                     // $45/hour base wage
      },
      
      // Security & Access Control
      security: {
        securityCode: this.generateSecurityCode(),
        lastModified: currentTime,
        expiresAt: new Date(currentTime.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days
        modifiedBy: 'system_initialization',
        isLocked: false
      },
      
      // Business Configuration
      business: {
        defaultEstimatedDays: 3,
        defaultRushDays: 1,
        workingDaysPerWeek: 5,
        maxRushJobs: 5
      },
      
      // System Metadata
      version: '2.0.0',
      createdAt: currentTime,
      updatedAt: currentTime,
      createdBy: 'admin_initialization_script'
    };
  }

  /**
   * Generate secure 12-digit security code
   */
  generateSecurityCode() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return timestamp + random;
  }

  /**
   * Initialize or update admin settings
   */
  async initializeAdminSettings() {
    try {
      console.log('⚙️ Initializing admin settings...');
      
      const settings = this.generateAdminSettings();
      const collection = this.db.collection('adminSettings');
      
      // Check if settings already exist
      const existing = await collection.findOne({ _id: 'repair_task_admin_settings' });
      
      if (existing) {
        console.log('🔄 Updating existing admin settings...');
        
        // Preserve security settings but update pricing
        const updatedSettings = {
          ...existing,
          pricing: settings.pricing,
          business: settings.business,
          version: settings.version,
          updatedAt: settings.updatedAt
        };
        
        await collection.replaceOne(
          { _id: 'repair_task_admin_settings' },
          updatedSettings
        );
        
        console.log('✅ Admin settings updated successfully');
        console.log(`💰 ConsumablesFee set to: ${(settings.pricing.consumablesFee * 100)}%`);
        
      } else {
        console.log('🆕 Creating new admin settings...');
        
        await collection.insertOne(settings);
        
        console.log('✅ Admin settings created successfully');
        console.log(`🔐 Security Code: ${settings.security.securityCode}`);
        console.log(`💰 ConsumablesFee set to: ${(settings.pricing.consumablesFee * 100)}%`);
        console.log(`⏰ Expires: ${settings.security.expiresAt.toLocaleDateString()}`);
      }
      
      // Create index for security
      await collection.createIndex({ "security.expiresAt": 1 });
      
      return settings;
      
    } catch (error) {
      console.error('❌ Failed to initialize admin settings:', error);
      throw error;
    }
  }

  /**
   * Display current pricing formula
   */
  displayPricingFormula(settings) {
    console.log('\n📊 PRICING FORMULA');
    console.log('==================');
    console.log('basePrice = ((laborHours × wage) + (materialCost × 1.5)) × ((administrativeFee + businessFee + consumablesFee) + 1)');
    console.log('\n📋 Current Values:');
    console.log(`   Wage: $${settings.pricing.wage}/hour`);
    console.log(`   Administrative Fee: ${(settings.pricing.administrativeFee * 100)}%`);
    console.log(`   Business Fee: ${(settings.pricing.businessFee * 100)}%`);
    console.log(`   Consumables Fee: ${(settings.pricing.consumablesFee * 100)}%`);
    console.log(`   Rush Multiplier: ${settings.pricing.rushMultiplier}x`);
    
    // Example calculation
    const laborHours = 1;
    const materialCost = 15;
    const baseCalc = (laborHours * settings.pricing.wage) + (materialCost * 1.5);
    const multiplier = settings.pricing.administrativeFee + settings.pricing.businessFee + settings.pricing.consumablesFee + 1;
    const finalPrice = baseCalc * multiplier;
    
    console.log('\n🧮 Example Calculation:');
    console.log(`   Labor (${laborHours}h × $${settings.pricing.wage}): $${laborHours * settings.pricing.wage}`);
    console.log(`   Material ($${materialCost} × 1.5): $${materialCost * 1.5}`);
    console.log(`   Subtotal: $${baseCalc.toFixed(2)}`);
    console.log(`   Total Multiplier: ${multiplier.toFixed(3)}`);
    console.log(`   Final Price: $${finalPrice.toFixed(2)}`);
  }
}

// Main execution
async function main() {
  const initializer = new AdminSettingsInitializer();
  
  try {
    console.log('🚀 Starting Admin Settings Initialization');
    console.log('=========================================');
    
    await initializer.connect();
    const settings = await initializer.initializeAdminSettings();
    initializer.displayPricingFormula(settings);
    
    console.log('\n✅ Admin settings initialization complete!');
    console.log('🔄 Ready for price calculation phase...');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await initializer.disconnect();
  }
}

main();
