import { db } from '@/lib/database';

/**
 * Service for managing repair tasks stored in MongoDB
 * These are the tasks pulled from Shopify and stored locally for faster access
 */
export class RepairTasksDatabaseService {
    
    /**
     * Fetch all repair tasks from MongoDB with optional filtering
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of repair tasks
     */
    static async fetchAll(filters = {}) {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const query = {};
            
            // Apply filters
            if (filters.sku) {
                query.sku = new RegExp(filters.sku, 'i');
            }
            
            if (filters.title) {
                query.title = new RegExp(filters.title, 'i');
            }
            
            if (filters.tags && filters.tags.length > 0) {
                query.tags = { $in: filters.tags };
            }
            
            if (filters.vendor) {
                query.vendor = filters.vendor;
            }
            
            if (filters.status) {
                query.status = filters.status;
            }
            
            if (filters.priceMin !== undefined) {
                query.price = { ...query.price, $gte: filters.priceMin };
            }
            
            if (filters.priceMax !== undefined) {
                query.price = { ...query.price, $lte: filters.priceMax };
            }
            
            // Search across title and description if searchQuery provided
            if (filters.searchQuery) {
                query.$text = { $search: filters.searchQuery };
            }
            
            const tasks = await collection
                .find(query)
                .sort({ title: 1 })
                .limit(filters.limit || 1000)
                .toArray();
            
            return tasks;
            
        } catch (error) {
            console.error('Error fetching repair tasks from MongoDB:', error);
            throw error;
        }
    }
    
    /**
     * Find a repair task by SKU
     * @param {string} sku - The SKU to search for
     * @returns {Promise<Object|null>} The repair task or null if not found
     */
    static async findBySku(sku) {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const task = await collection.findOne({ sku: sku });
            return task;
            
        } catch (error) {
            console.error('Error finding repair task by SKU:', error);
            throw error;
        }
    }
    
    /**
     * Get all unique tags from repair tasks
     * @returns {Promise<Array>} Array of unique tags
     */
    static async getTags() {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const tags = await collection.distinct('tags');
            return tags.sort();
            
        } catch (error) {
            console.error('Error getting repair task tags:', error);
            throw error;
        }
    }
    
    /**
     * Get all unique vendors from repair tasks
     * @returns {Promise<Array>} Array of unique vendors
     */
    static async getVendors() {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const vendors = await collection.distinct('vendor');
            return vendors.filter(v => v).sort();
            
        } catch (error) {
            console.error('Error getting repair task vendors:', error);
            throw error;
        }
    }
    
    /**
     * Get repair tasks statistics
     * @returns {Promise<Object>} Statistics object
     */
    static async getStatistics() {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalTasks: { $sum: 1 },
                        totalValue: { $sum: '$price' },
                        averagePrice: { $avg: '$price' },
                        minPrice: { $min: '$price' },
                        maxPrice: { $max: '$price' }
                    }
                }
            ]).toArray();
            
            const uniqueProducts = await collection.distinct('shopifyProductId');
            const lastSync = await collection.findOne({}, { sort: { syncedAt: -1 } });
            
            return {
                totalTasks: stats[0]?.totalTasks || 0,
                uniqueProducts: uniqueProducts.length,
                totalValue: stats[0]?.totalValue || 0,
                averagePrice: stats[0]?.averagePrice || 0,
                minPrice: stats[0]?.minPrice || 0,
                maxPrice: stats[0]?.maxPrice || 0,
                lastSyncDate: lastSync?.syncedAt || null
            };
            
        } catch (error) {
            console.error('Error getting repair tasks statistics:', error);
            throw error;
        }
    }
    
    /**
     * Update the sync timestamp for a repair task
     * @param {string} sku - The SKU to update
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Update result
     */
    static async updateTask(sku, updates) {
        try {
            const database = await db.connect();
            const collection = database.collection('repairTasks');
            
            const result = await collection.updateOne(
                { sku: sku },
                { 
                    $set: {
                        ...updates,
                        updatedAt: new Date()
                    }
                }
            );
            
            return result;
            
        } catch (error) {
            console.error('Error updating repair task:', error);
            throw error;
        }
    }
}

export default RepairTasksDatabaseService;
