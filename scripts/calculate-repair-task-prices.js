#!/usr/bin/env node

/**
 * Calculate and update basePrice for all migrated repair tasks using v2.0 business formula
 * Formula: ((laborHours × wage) + (materialCost × 1.5)) × ((administrativeFee + businessFee + consumablesFee) + 1)
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

class RepairTaskPriceCalculator {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.adminSettings = null;
    this.stats = {
      processed: 0,
      updated: 0,
      errors: [],
      priceComparison: []
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
      console.log('🔌 MongoDB connection closed');
    }
  }

  /**
   * Load admin settings for pricing calculation
   */
  async loadAdminSettings() {
    try {
      const collection = this.db.collection('adminSettings');
      this.adminSettings = await collection.findOne({ _id: 'repair_task_admin_settings' });
      
      if (!this.adminSettings) {
        throw new Error('Admin settings not found. Run initialize-admin-settings.js first.');
      }
      
      console.log('⚙️ Loaded admin settings for price calculation');
      console.log(`   Wage: $${this.adminSettings.pricing.wage}/hour`);
      console.log(`   Fees: ${((this.adminSettings.pricing.administrativeFee + this.adminSettings.pricing.businessFee + this.adminSettings.pricing.consumablesFee) * 100).toFixed(1)}% total`);
      
    } catch (error) {
      console.error('❌ Failed to load admin settings:', error);
      throw error;
    }
  }

  /**
   * Calculate basePrice using v2.0 business formula
   */
  calculateBasePrice(laborHours, materialCost, isRush = false) {
    const pricing = this.adminSettings.pricing;
    
    // Core calculation: (labor + material markup)
    const laborCost = laborHours * pricing.wage;
    const materialMarkup = materialCost * 1.5;
    const subtotal = laborCost + materialMarkup;
    
    // Business multiplier: (admin + business + consumables) + 1
    const businessMultiplier = pricing.administrativeFee + pricing.businessFee + pricing.consumablesFee + 1;
    
    // Base price calculation
    let basePrice = subtotal * businessMultiplier;
    
    // Apply rush multiplier if needed
    if (isRush) {
      basePrice *= pricing.rushMultiplier;
    }
    
    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Update all repair tasks with calculated prices
   */
  async calculateAllPrices() {
    try {
      console.log('💰 Starting price calculation for all repair tasks...');
      
      const collection = this.db.collection('repairTasks');
      const tasks = await collection.find({}).toArray();
      
      console.log(`📊 Found ${tasks.length} tasks to update`);
      
      const bulkOps = [];
      
      for (const task of tasks) {
        try {
          const oldPrice = task.analytics?.originalPrice || 0;
          const newPrice = this.calculateBasePrice(task.laborHours, task.materialCost);
          
          // Update operation
          bulkOps.push({
            updateOne: {
              filter: { _id: task._id },
              update: {
                $set: {
                  basePrice: newPrice,
                  'pricing.calculatedAt': new Date(),
                  'pricing.formula': 'v2.0_business_formula',
                  'pricing.components': {
                    laborHours: task.laborHours,
                    laborCost: task.laborHours * this.adminSettings.pricing.wage,
                    materialCost: task.materialCost,
                    materialMarkup: task.materialCost * 1.5,
                    businessMultiplier: this.adminSettings.pricing.administrativeFee + this.adminSettings.pricing.businessFee + this.adminSettings.pricing.consumablesFee + 1,
                    wage: this.adminSettings.pricing.wage,
                    fees: {
                      administrative: this.adminSettings.pricing.administrativeFee,
                      business: this.adminSettings.pricing.businessFee,
                      consumables: this.adminSettings.pricing.consumablesFee
                    }
                  }
                }
              }
            }
          });
          
          // Track price comparison
          this.stats.priceComparison.push({
            sku: task.sku,
            title: task.title,
            category: task.category,
            oldPrice: oldPrice,
            newPrice: newPrice,
            difference: newPrice - oldPrice,
            percentChange: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0
          });
          
          this.stats.processed++;
          
        } catch (error) {
          console.error(`❌ Error calculating price for task ${task.sku}:`, error.message);
          this.stats.errors.push({
            sku: task.sku,
            error: error.message
          });
        }
      }
      
      // Execute bulk update
      if (bulkOps.length > 0) {
        console.log(`🔄 Updating ${bulkOps.length} tasks with calculated prices...`);
        const result = await collection.bulkWrite(bulkOps);
        this.stats.updated = result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} tasks successfully`);
      }
      
    } catch (error) {
      console.error('❌ Price calculation failed:', error);
      throw error;
    }
  }

  /**
   * Display calculation summary and statistics
   */
  displaySummary() {
    console.log('\n📈 PRICE CALCULATION SUMMARY');
    console.log('============================');
    console.log(`📊 Tasks Processed: ${this.stats.processed}`);
    console.log(`✅ Successfully Updated: ${this.stats.updated}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => {
        console.log(`   ${error.sku}: ${error.error}`);
      });
    }
    
    // Price analysis
    const comparisons = this.stats.priceComparison;
    if (comparisons.length > 0) {
      const avgOldPrice = comparisons.reduce((sum, c) => sum + c.oldPrice, 0) / comparisons.length;
      const avgNewPrice = comparisons.reduce((sum, c) => sum + c.newPrice, 0) / comparisons.length;
      const avgChange = avgNewPrice - avgOldPrice;
      const avgPercentChange = avgOldPrice > 0 ? (avgChange / avgOldPrice * 100) : 0;
      
      console.log('\n💰 Price Analysis:');
      console.log(`   Average Old Price: $${avgOldPrice.toFixed(2)}`);
      console.log(`   Average New Price: $${avgNewPrice.toFixed(2)}`);
      console.log(`   Average Change: ${avgChange >= 0 ? '+' : ''}$${avgChange.toFixed(2)} (${avgPercentChange >= 0 ? '+' : ''}${avgPercentChange.toFixed(1)}%)`);
      
      // Category breakdown
      const categories = {};
      comparisons.forEach(c => {
        if (!categories[c.category]) {
          categories[c.category] = { count: 0, avgOld: 0, avgNew: 0, tasks: [] };
        }
        categories[c.category].tasks.push(c);
        categories[c.category].count++;
      });
      
      console.log('\n📂 By Category:');
      Object.entries(categories).forEach(([category, data]) => {
        const avgOld = data.tasks.reduce((sum, t) => sum + t.oldPrice, 0) / data.count;
        const avgNew = data.tasks.reduce((sum, t) => sum + t.newPrice, 0) / data.count;
        const change = avgNew - avgOld;
        const percentChange = avgOld > 0 ? (change / avgOld * 100) : 0;
        
        console.log(`   ${category} (${data.count} tasks): $${avgOld.toFixed(2)} → $${avgNew.toFixed(2)} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);
      });
      
      // Show some examples
      console.log('\n📋 Sample Price Updates:');
      const samples = comparisons.slice(0, 5);
      samples.forEach(sample => {
        const change = sample.newPrice - sample.oldPrice;
        console.log(`   ${sample.sku}: $${sample.oldPrice} → $${sample.newPrice} (${change >= 0 ? '+' : ''}$${change.toFixed(2)})`);
      });
    }
  }
}

// Main execution
async function main() {
  const calculator = new RepairTaskPriceCalculator();
  
  try {
    console.log('🚀 Starting Repair Task Price Calculation');
    console.log('=========================================');
    
    await calculator.connect();
    await calculator.loadAdminSettings();
    await calculator.calculateAllPrices();
    calculator.displaySummary();
    
    console.log('\n✅ Price calculation completed successfully!');
    console.log('🔄 Ready for Shopify product creation phase...');
    
  } catch (error) {
    console.error('❌ Price calculation failed:', error);
    process.exit(1);
  } finally {
    await calculator.disconnect();
  }
}

main();
