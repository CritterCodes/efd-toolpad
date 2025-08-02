#!/usr/bin/env node

/**
 * Create new Shopify products from migrated v2.0 repair tasks
 * This script will create fresh Shopify products with calculated pricing and new SKU structure
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

class ShopifyProductCreator {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.shopifyStore = process.env.SHOPIFY_STORE_URL;
    this.shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.stats = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [],
      skipped: 0
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
   * Create Shopify product GraphQL mutation
   */
  createShopifyProductMutation(task) {
    // Generate comprehensive product description
    const description = this.generateProductDescription(task);
    
    // Determine product tags
    const tags = this.generateProductTags(task);
    
    // Create product input
    const productInput = {
      title: task.title,
      descriptionHtml: description,
      vendor: '[efd] Repair Shop',
      productType: 'Repair Service',
      tags: tags,
      status: 'ACTIVE',
      variants: [{
        price: task.basePrice.toString(),
        sku: task.sku,
        inventoryPolicy: 'CONTINUE',
        inventoryManagement: null,
        requiresShipping: false,
        weight: 0,
        weightUnit: 'POUNDS'
      }]
    };

    return {
      query: `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              handle
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    sku
                    price
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        input: productInput
      }
    };
  }

  /**
   * Generate rich product description with service details
   */
  generateProductDescription(task) {
    const serviceTime = task.service?.estimatedDays || 3;
    const rushTime = task.service?.rushDays || 1;
    const skillLevel = task.service?.skillLevel || 'standard';
    
    let description = `<h3>${task.title}</h3>`;
    
    if (task.description) {
      description += `<p>${task.description}</p>`;
    }
    
    description += `
      <h4>Service Details</h4>
      <ul>
        <li><strong>Category:</strong> ${this.formatCategory(task.category)}</li>
        <li><strong>Estimated Time:</strong> ${serviceTime} business days</li>
        <li><strong>Rush Available:</strong> ${rushTime} business day (${((task.service?.rushMultiplier || 1.5) - 1) * 100}% surcharge)</li>
        <li><strong>Skill Level:</strong> ${this.formatSkillLevel(skillLevel)}</li>
    `;
    
    if (task.metalType && task.requiresMetalType) {
      description += `<li><strong>Metal Type:</strong> ${this.formatMetalType(task.metalType)}</li>`;
    }
    
    if (task.service?.equipmentNeeded?.length > 0) {
      description += `<li><strong>Equipment:</strong> ${task.service.equipmentNeeded.join(', ')}</li>`;
    }
    
    description += `
      </ul>
      <h4>Pricing Information</h4>
      <ul>
        <li><strong>Labor:</strong> ${task.laborHours} hours @ $${task.pricing?.components?.wage || 45}/hour</li>
        <li><strong>Materials:</strong> Included with 50% markup</li>
        <li><strong>Service Fee:</strong> Administrative and business fees included</li>
      </ul>
      <p><em>SKU: ${task.sku} | ShortCode: ${task.shortCode}</em></p>
    `;
    
    return description;
  }

  /**
   * Generate product tags for filtering and organization
   */
  generateProductTags(task) {
    const tags = [
      'repair task',
      'jewelry repair',
      task.category,
      `skill-${task.service?.skillLevel || 'standard'}`,
      `risk-${task.service?.riskLevel || 'low'}`,
      `days-${task.service?.estimatedDays || 3}`
    ];
    
    if (task.metalType) {
      tags.push(`metal-${task.metalType}`);
    }
    
    if (task.subcategory) {
      tags.push(task.subcategory);
    }
    
    if (task.service?.departments?.length > 0) {
      task.service.departments.forEach(dept => tags.push(`dept-${dept}`));
    }
    
    return tags;
  }

  /**
   * Format category for display
   */
  formatCategory(category) {
    const categoryMap = {
      'shank': 'Shank & Sizing',
      'prongs': 'Prong Repair',
      'stone_setting': 'Stone Setting',
      'chains': 'Chain Repair',
      'misc': 'Miscellaneous'
    };
    return categoryMap[category] || category;
  }

  /**
   * Format skill level for display
   */
  formatSkillLevel(skillLevel) {
    const skillMap = {
      'basic': 'Basic',
      'standard': 'Standard',
      'advanced': 'Advanced',
      'expert': 'Expert'
    };
    return skillMap[skillLevel] || skillLevel;
  }

  /**
   * Format metal type for display
   */
  formatMetalType(metalType) {
    const metalMap = {
      'gold': 'Gold',
      'silver': 'Silver', 
      'platinum': 'Platinum',
      'mixed': 'Mixed Metals'
    };
    return metalMap[metalType] || metalType;
  }

  /**
   * Make GraphQL request to Shopify
   */
  async makeShopifyRequest(mutation) {
    const response = await fetch(`https://${this.shopifyStore}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.shopifyToken
      },
      body: JSON.stringify(mutation)
    });

    if (!response.ok) {
      throw new Error(`Shopify API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create single Shopify product from repair task
   */
  async createShopifyProduct(task) {
    try {
      console.log(`📦 Creating Shopify product for ${task.sku}...`);
      
      const mutation = this.createShopifyProductMutation(task);
      const response = await this.makeShopifyRequest(mutation);
      
      if (response.data?.productCreate?.userErrors?.length > 0) {
        throw new Error(`Shopify errors: ${response.data.productCreate.userErrors.map(e => e.message).join(', ')}`);
      }
      
      const product = response.data?.productCreate?.product;
      if (!product) {
        throw new Error('No product returned from Shopify');
      }
      
      // Update repair task with Shopify product info
      await this.updateTaskWithShopifyInfo(task._id, product);
      
      console.log(`✅ Created product: ${product.title} (${product.id})`);
      return product;
      
    } catch (error) {
      console.error(`❌ Failed to create product for ${task.sku}: ${error.message}`);
      this.stats.errors.push({
        sku: task.sku,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update repair task with Shopify product information
   */
  async updateTaskWithShopifyInfo(taskId, shopifyProduct) {
    const variant = shopifyProduct.variants?.edges?.[0]?.node;
    
    const shopifyInfo = {
      productId: shopifyProduct.id,
      variantId: variant?.id,
      handle: shopifyProduct.handle,
      syncedAt: new Date(),
      syncVersion: '2.0.0'
    };

    await this.db.collection('repairTasks').updateOne(
      { _id: taskId },
      { 
        $set: { 
          'shopify': shopifyInfo,
          'display.shopifyUrl': `https://${this.shopifyStore.replace('.myshopify.com', '')}.myshopify.com/products/${shopifyProduct.handle}`
        }
      }
    );
  }

  /**
   * Create all Shopify products from repair tasks
   */
  async createAllProducts(batchSize = 5) {
    try {
      console.log('🛍️ Starting Shopify product creation from v2.0 repair tasks...');
      
      const collection = this.db.collection('repairTasks');
      
      // Get tasks that don't have Shopify products yet (v2.0 products)
      const tasks = await collection.find({
        'shopify.syncVersion': { $ne: '2.0.0' }
      }).toArray();
      
      console.log(`📊 Found ${tasks.length} tasks needing Shopify products`);
      
      if (tasks.length === 0) {
        console.log('ℹ️ All tasks already have v2.0 Shopify products');
        return;
      }
      
      // Process in batches to avoid rate limiting
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)} (${batch.length} products)...`);
        
        for (const task of batch) {
          try {
            await this.createShopifyProduct(task);
            this.stats.created++;
            this.stats.processed++;
            
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            this.stats.processed++;
            // Error already logged in createShopifyProduct
          }
        }
        
        // Longer pause between batches
        if (i + batchSize < tasks.length) {
          console.log('⏱️ Pausing between batches...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error('❌ Product creation failed:', error);
      throw error;
    }
  }

  /**
   * Display creation summary
   */
  displaySummary() {
    console.log('\n🛍️ SHOPIFY PRODUCT CREATION SUMMARY');
    console.log('===================================');
    console.log(`📊 Tasks Processed: ${this.stats.processed}`);
    console.log(`✅ Products Created: ${this.stats.created}`);
    console.log(`🔄 Products Updated: ${this.stats.updated}`);
    console.log(`⏭️ Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => {
        console.log(`   ${error.sku}: ${error.error}`);
      });
    }
  }
}

// Main execution
async function main() {
  const creator = new ShopifyProductCreator();
  
  try {
    console.log('🚀 Starting Shopify Product Creation');
    console.log('====================================');
    
    await creator.connect();
    await creator.createAllProducts();
    creator.displaySummary();
    
    console.log('\n✅ Shopify product creation completed!');
    console.log('🎉 Phase 2 complete - Ready for admin interface development...');
    
  } catch (error) {
    console.error('❌ Product creation failed:', error);
    process.exit(1);
  } finally {
    await creator.disconnect();
  }
}

main();
