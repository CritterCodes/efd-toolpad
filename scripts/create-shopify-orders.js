#!/usr/bin/env node

/**
 * Create Shopify orders with custom line items from repair tasks
 * This approach bypasses product creation and uses Shopify's custom line item feature
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

class ShopifyOrderCreator {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.shopifyStore = process.env.SHOPIFY_STORE_URL;
    this.shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.adminSettings = null;
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

  async loadAdminSettings() {
    try {
      const collection = this.db.collection('adminSettings');
      this.adminSettings = await collection.findOne({ _id: 'repair_task_admin_settings' });
      
      if (!this.adminSettings) {
        throw new Error('Admin settings not found. Run initialize-admin-settings.js first.');
      }
      
      console.log('⚙️ Loaded admin settings for order creation');
    } catch (error) {
      console.error('❌ Failed to load admin settings:', error);
      throw error;
    }
  }

  /**
   * Create custom line item from repair task
   */
  createCustomLineItem(task, quantity = 1, isRush = false) {
    // Calculate final price with any modifiers
    let finalPrice = task.basePrice;
    
    if (isRush && task.service?.rushMultiplier) {
      finalPrice *= task.service.rushMultiplier;
    }

    // Create detailed line item description
    const description = this.createLineItemDescription(task, isRush);

    return {
      title: `${task.title} (${task.category.toUpperCase()})`,
      price: finalPrice.toFixed(2),
      quantity: quantity,
      sku: task.sku,
      vendor: '[EFD] Repair Shop',
      product_exists: false, // This makes it a custom line item
      fulfillment_service: 'manual',
      requires_shipping: false,
      taxable: true,
      properties: [
        { name: 'Service Category', value: this.formatCategory(task.category) },
        { name: 'Short Code', value: task.shortCode },
        { name: 'Metal Type', value: task.metalType || 'N/A' },
        { name: 'Estimated Days', value: task.service?.estimatedDays || 3 },
        { name: 'Rush Service', value: isRush ? 'Yes' : 'No' },
        { name: 'Labor Hours', value: task.laborHours },
        { name: 'Skill Level', value: task.service?.skillLevel || 'standard' },
        { name: 'Risk Level', value: task.service?.riskLevel || 'low' }
      ]
    };
  }

  /**
   * Create detailed line item description
   */
  createLineItemDescription(task, isRush = false) {
    let description = `${task.title}`;
    
    if (task.description) {
      description += ` - ${task.description}`;
    }

    description += ` | Category: ${this.formatCategory(task.category)}`;
    description += ` | Est. Time: ${task.service?.estimatedDays || 3} days`;
    
    if (isRush) {
      description += ` | RUSH SERVICE (${task.service?.rushDays || 1} day)`;
    }
    
    if (task.metalType) {
      description += ` | Metal: ${this.formatMetalType(task.metalType)}`;
    }

    description += ` | SKU: ${task.sku}`;
    
    return description;
  }

  /**
   * Create Shopify order with repair task line items
   */
  async createRepairOrder(customerInfo, repairTasks, orderOptions = {}) {
    try {
      console.log(`📋 Creating order with ${repairTasks.length} repair tasks...`);

      // Create line items from repair tasks
      const lineItems = repairTasks.map(item => {
        const task = item.task;
        const quantity = item.quantity || 1;
        const isRush = item.isRush || false;
        
        return this.createCustomLineItem(task, quantity, isRush);
      });

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      const taxRate = orderOptions.taxRate || 0.08; // 8% default tax
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Create order payload
      const orderData = {
        order: {
          line_items: lineItems,
          customer: customerInfo,
          financial_status: orderOptions.financialStatus || 'pending',
          fulfillment_status: null,
          send_receipt: orderOptions.sendReceipt || false,
          send_fulfillment_receipt: false,
          note: orderOptions.note || 'Repair service order created via EFD system',
          tags: ['repair-service', 'efd-system', ...(orderOptions.tags || [])],
          tax_lines: [
            {
              title: 'Sales Tax',
              price: taxAmount.toFixed(2),
              rate: taxRate
            }
          ],
          note_attributes: [
            { name: 'Order Source', value: 'EFD Repair System' },
            { name: 'Created By', value: orderOptions.createdBy || 'system' },
            { name: 'Order Type', value: 'Repair Service' },
            { name: 'Total Tasks', value: repairTasks.length.toString() }
          ]
        }
      };

      // Add shipping if specified
      if (orderOptions.shipping) {
        orderData.order.shipping_lines = [
          {
            title: orderOptions.shipping.method || 'Standard Shipping',
            price: orderOptions.shipping.cost || '0.00',
            code: orderOptions.shipping.code || 'STANDARD'
          }
        ];
      }

      console.log(`💰 Order Summary: ${repairTasks.length} items, $${subtotal.toFixed(2)} + $${taxAmount.toFixed(2)} tax = $${total.toFixed(2)}`);

      // Create order via Shopify API
      const response = await this.makeShopifyRequest('POST', '/admin/api/2024-01/orders.json', orderData);

      if (!response.order) {
        throw new Error('No order returned from Shopify');
      }

      console.log(`✅ Order created: #${response.order.order_number} (${response.order.id})`);
      
      // Update repair tasks with order information
      await this.updateTasksWithOrderInfo(repairTasks, response.order);

      return response.order;

    } catch (error) {
      console.error(`❌ Failed to create repair order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update repair tasks with Shopify order information
   */
  async updateTasksWithOrderInfo(repairTasks, shopifyOrder) {
    const bulkOps = [];

    repairTasks.forEach((item, index) => {
      const lineItem = shopifyOrder.line_items[index];
      
      bulkOps.push({
        updateOne: {
          filter: { _id: item.task._id },
          update: {
            $push: {
              'orders': {
                shopifyOrderId: shopifyOrder.id,
                orderNumber: shopifyOrder.order_number,
                lineItemId: lineItem.id,
                createdAt: new Date(shopifyOrder.created_at),
                status: shopifyOrder.financial_status,
                quantity: item.quantity || 1,
                finalPrice: parseFloat(lineItem.price),
                isRush: item.isRush || false
              }
            }
          }
        }
      });
    });

    if (bulkOps.length > 0) {
      await this.db.collection('repairTasks').bulkWrite(bulkOps);
      console.log(`📊 Updated ${bulkOps.length} repair tasks with order info`);
    }
  }

  /**
   * Make REST API request to Shopify
   */
  async makeShopifyRequest(method, endpoint, data = null) {
    const url = `https://${this.shopifyStore}${endpoint}`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.shopifyToken
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
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
   * Get repair task by SKU for order creation
   */
  async getRepairTaskBySku(sku) {
    const task = await this.db.collection('repairTasks').findOne({ sku: sku });
    if (!task) {
      throw new Error(`Repair task not found: ${sku}`);
    }
    return task;
  }

  /**
   * Create example repair order (for testing)
   */
  async createExampleOrder() {
    console.log('🧪 Creating example repair order...');

    // Get a few repair tasks
    const tasks = await this.db.collection('repairTasks').find({}).limit(3).toArray();
    
    if (tasks.length === 0) {
      throw new Error('No repair tasks found in database');
    }

    // Example customer info
    const customerInfo = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567'
    };

    // Create repair task items
    const repairTasks = [
      { task: tasks[0], quantity: 1, isRush: false },
      { task: tasks[1], quantity: 1, isRush: true },
      { task: tasks[2], quantity: 2, isRush: false }
    ];

    // Order options
    const orderOptions = {
      note: 'Example repair order created for testing custom line items',
      tags: ['test-order', 'example'],
      createdBy: 'test-script',
      taxRate: 0.08,
      sendReceipt: false
    };

    const order = await this.createRepairOrder(customerInfo, repairTasks, orderOptions);
    
    console.log(`🎉 Example order created successfully!`);
    console.log(`   Order #${order.order_number}`);
    console.log(`   Total: $${order.total_price}`);
    console.log(`   Line Items: ${order.line_items.length}`);
    
    return order;
  }
}

// Main execution
async function main() {
  const creator = new ShopifyOrderCreator();
  
  try {
    console.log('🚀 Shopify Custom Line Item Order Creator');
    console.log('=========================================');
    
    await creator.connect();
    await creator.loadAdminSettings();
    
    // Create example order to demonstrate functionality
    await creator.createExampleOrder();
    
    console.log('\n✅ Custom line item order creation ready!');
    console.log('📋 You can now create repair orders without cluttering products');
    console.log('🔄 Each order uses custom line items with detailed repair task info');
    
  } catch (error) {
    console.error('❌ Order creation failed:', error);
    process.exit(1);
  } finally {
    await creator.disconnect();
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = ShopifyOrderCreator;
