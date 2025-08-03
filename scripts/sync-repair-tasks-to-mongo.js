#!/usr/bin/env node

/**
 * One-time script to pull all repair tasks from Shopify and store them in MongoDB
 * Usage: node scripts/sync-repair-tasks-to-mongo.js
 */

const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { 
    getShopifyConfig, 
    isShopifyEnabled, 
    getShopifyGraphQLUrl, 
    getShopifyHeaders 
} = require('./shopifyConfig');

// Load environment variables
dotenv.config({ path: '../.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'efd-database';

class RepairTaskSyncService {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connectToMongoDB() {
        try {
            console.log('🔗 Connecting to MongoDB...');
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(MONGO_DB_NAME);
            console.log('✅ MongoDB Connected');
        } catch (error) {
            console.error('❌ MongoDB Connection Error:', error);
            throw error;
        }
    }

    async fetchRepairTasksFromShopify() {
        // Check if Shopify is enabled and get configuration
        if (!(await isShopifyEnabled())) {
            throw new Error("❌ Shopify integration is not enabled or not properly configured.");
        }

        const shopifyConfig = await getShopifyConfig();
        console.log('🛍️ Fetching repair tasks from Shopify...');

        // Enhanced query to get more product data and handle pagination
        const query = `
        {
            products(first: 250, query: "tag:'repair task' AND status:'ACTIVE'") {
                edges {
                    node {
                        id
                        title
                        handle
                        tags
                        status
                        createdAt
                        updatedAt
                        productType
                        vendor
                        description
                        variants(first: 50) {
                            edges {
                                node {
                                    id
                                    price
                                    sku
                                    inventoryQuantity
                                    weight
                                    weightUnit
                                    createdAt
                                    updatedAt
                                }
                            }
                        }
                        images(first: 5) {
                            edges {
                                node {
                                    id
                                    url
                                    altText
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`;

        try {
            const url = getShopifyGraphQLUrl(shopifyConfig.storeUrl, shopifyConfig.apiVersion);
            const headers = getShopifyHeaders(shopifyConfig.accessToken);

            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ query }),
            });

            const result = await response.json();

            // Check for GraphQL errors
            if (result.errors) {
                console.error("❌ Shopify GraphQL Errors:", result.errors);
                throw new Error("Failed to fetch repair tasks from Shopify.");
            }

            // Ensure the data exists
            if (!result.data?.products?.edges) {
                throw new Error("❌ Unexpected response structure from Shopify API.");
            }

            console.log(`✅ Found ${result.data.products.edges.length} repair task products`);

            // Transform the data into a more usable format
            const repairTasks = [];

            result.data.products.edges.forEach((edge) => {
                const product = edge.node;
                
                product.variants.edges.forEach((variantEdge) => {
                    const variant = variantEdge.node;
                    
                    const repairTask = {
                        // Shopify IDs
                        shopifyProductId: product.id,
                        shopifyVariantId: variant.id,
                        
                        // Product information
                        title: product.title,
                        handle: product.handle,
                        description: product.description,
                        productType: product.productType,
                        vendor: product.vendor,
                        tags: Array.isArray(product.tags) ? product.tags : (product.tags ? product.tags.split(', ') : []),
                        status: product.status,
                        
                        // Variant information
                        sku: variant.sku,
                        price: parseFloat(variant.price) || 0,
                        inventoryQuantity: variant.inventoryQuantity || 0,
                        weight: variant.weight || 0,
                        weightUnit: variant.weightUnit || 'GRAMS',
                        
                        // Images
                        images: product.images.edges.map(imageEdge => ({
                            id: imageEdge.node.id,
                            url: imageEdge.node.url,
                            altText: imageEdge.node.altText
                        })),
                        
                        // Timestamps
                        shopifyCreatedAt: new Date(product.createdAt),
                        shopifyUpdatedAt: new Date(product.updatedAt),
                        variantCreatedAt: new Date(variant.createdAt),
                        variantUpdatedAt: new Date(variant.updatedAt),
                        
                        // Script metadata
                        syncedAt: new Date(),
                        syncVersion: '1.0.0'
                    };
                    
                    // Only add if SKU exists
                    if (variant.sku) {
                        repairTasks.push(repairTask);
                    }
                });
            });

            return repairTasks;

        } catch (error) {
            console.error("❌ Error fetching repair tasks from Shopify:", error.message);
            throw error;
        }
    }

    async storeRepairTasksInMongo(repairTasks) {
        console.log(`💾 Storing ${repairTasks.length} repair tasks in MongoDB...`);

        try {
            const collection = this.db.collection('repairTasks');

            // Create indexes for better query performance
            await collection.createIndex({ sku: 1 }, { unique: true });
            await collection.createIndex({ shopifyProductId: 1 });
            await collection.createIndex({ shopifyVariantId: 1 });
            await collection.createIndex({ title: 'text', description: 'text' });
            await collection.createIndex({ tags: 1 });
            await collection.createIndex({ status: 1 });

            console.log('✅ Indexes created');

            // Use upsert to avoid duplicates based on SKU
            const bulkOps = repairTasks.map(task => ({
                updateOne: {
                    filter: { sku: task.sku },
                    update: { $set: task },
                    upsert: true
                }
            }));

            const result = await collection.bulkWrite(bulkOps);

            console.log('✅ Bulk write completed:');
            console.log(`   - Inserted: ${result.upsertedCount}`);
            console.log(`   - Updated: ${result.modifiedCount}`);
            console.log(`   - Matched: ${result.matchedCount}`);

            return result;

        } catch (error) {
            console.error('❌ Error storing repair tasks in MongoDB:', error);
            throw error;
        }
    }

    async generateSummaryReport(repairTasks) {
        console.log('\n📊 SYNC SUMMARY REPORT');
        console.log('=' .repeat(50));
        
        const totalTasks = repairTasks.length;
        const uniqueProducts = new Set(repairTasks.map(task => task.shopifyProductId)).size;
        const totalValue = repairTasks.reduce((sum, task) => sum + task.price, 0);
        const tagsCount = {};
        const vendorsCount = {};

        repairTasks.forEach(task => {
            task.tags.forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
            
            if (task.vendor) {
                vendorsCount[task.vendor] = (vendorsCount[task.vendor] || 0) + 1;
            }
        });

        console.log(`Total Repair Tasks: ${totalTasks}`);
        console.log(`Unique Products: ${uniqueProducts}`);
        console.log(`Total Value: $${totalValue.toFixed(2)}`);
        console.log(`Average Price: $${(totalValue / totalTasks).toFixed(2)}`);
        
        console.log('\nTop Tags:');
        Object.entries(tagsCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([tag, count]) => {
                console.log(`  ${tag}: ${count}`);
            });

        if (Object.keys(vendorsCount).length > 0) {
            console.log('\nVendors:');
            Object.entries(vendorsCount)
                .sort(([,a], [,b]) => b - a)
                .forEach(([vendor, count]) => {
                    console.log(`  ${vendor}: ${count}`);
                });
        }

        console.log('=' .repeat(50));
    }

    async cleanup() {
        if (this.client) {
            await this.client.close();
            console.log('🔒 MongoDB connection closed');
        }
    }

    async run() {
        try {
            console.log('🚀 Starting Repair Tasks Sync Script');
            console.log('=' .repeat(50));

            // Validate environment variables
            if (!MONGODB_URI) {
                throw new Error('❌ Missing required environment variable: MONGODB_URI');
            }

            // Check if Shopify integration is enabled
            if (!(await isShopifyEnabled())) {
                throw new Error('❌ Shopify integration is not enabled or not properly configured in admin settings');
            }

            // Connect to MongoDB
            await this.connectToMongoDB();

            // Fetch repair tasks from Shopify
            const repairTasks = await this.fetchRepairTasksFromShopify();

            if (repairTasks.length === 0) {
                console.log('⚠️ No repair tasks found in Shopify');
                return;
            }

            // Store in MongoDB
            await this.storeRepairTasksInMongo(repairTasks);

            // Generate summary report
            await this.generateSummaryReport(repairTasks);

            console.log('\n✅ Sync completed successfully!');

        } catch (error) {
            console.error('\n❌ Sync failed:', error.message);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the script
const syncService = new RepairTaskSyncService();
syncService.run().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
