/**
 * Tasks Model
 * Database operations for task management
 */

import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import Constants from '@/lib/constants';

export class TasksModel {
  static collectionName = Constants.TASKS_COLLECTION || 'tasks';

  /**
   * Check if a task with given title exists (excluding specific ID)
   */
  static async taskTitleExists(title, excludeId = null) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const query = { title };
      if (excludeId) {
        query._id = { $ne: new ObjectId(excludeId) };
      }
      
      const existingTask = await collection.findOne(query);
      return !!existingTask;
    } catch (error) {
      console.error('Error checking task title existence:', error);
      throw error;
    }
  }

  /**
   * Get all tasks with filtering and pagination
   */
  static async getTasks(filters = {}) {
    try {
      console.log('🔥 MODEL - getTasks called with filters:', filters);
      
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      console.log('🔥 MODEL - Connected to collection:', this.collectionName);
      
      const query = this.buildQuery(filters);
      console.log('🔥 MODEL - Query to execute:', query);
      
      // Handle pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const skip = (page - 1) * limit;
      
      // Handle sorting
      const sort = {};
      if (filters.sortBy) {
        sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.title = 1; // Default sort by title ascending
      }
      
      console.log('🔥 MODEL - Pagination and sort:', { page, limit, skip, sort });
      
      const tasks = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
        
      console.log('🔥 MODEL - Tasks found:', {
        count: tasks.length,
        sampleTitles: tasks.slice(0, 3).map(t => t.title)
      });
        
      const total = await collection.countDocuments(query);
      console.log('🔥 MODEL - Total documents matching query:', total);
      
      const result = {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
      console.log('🔥 MODEL - Returning result:', {
        tasksCount: result.tasks.length,
        paginationTotal: result.pagination.total
      });
      
      return result;
    } catch (error) {
      console.error('🔥 MODEL - Error getting tasks:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const task = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      return task;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      throw error;
    }
  }

  /**
   * Create new task
   */
  static async createTask(taskData) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const newTask = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newTask);
      
      if (!result.insertedId) {
        throw new Error('Failed to create task');
      }
      
      return await this.getTaskById(result.insertedId);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update task
   */
  static async updateTask(id, updateData) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const updatePayload = {
        ...updateData,
        updatedAt: new Date()
      };
      
      // Remove _id from update data if present
      delete updatePayload._id;
      
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatePayload }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Task not found');
      }
      
      return await this.getTaskById(id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task (soft delete by default)
   */
  static async deleteTask(id, hardDelete = false, userEmail = null) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      if (hardDelete) {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          throw new Error('Task not found');
        }
        return { success: true, message: 'Task permanently deleted' };
      } else {
        // Soft delete with enhanced tracking
        const updateFields = {
          isActive: false,
          archivedAt: new Date(),
          deletedAt: new Date(),
          updatedAt: new Date()
        };
        
        if (userEmail) {
          updateFields.deletedBy = userEmail;
        }
        
        const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );
        
        if (result.matchedCount === 0) {
          throw new Error('Task not found');
        }
        
        return { success: true, message: 'Task archived successfully' };
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Get task price for specific metal context
   * @param {string} taskId - Task ID
   * @param {string} metalType - Metal type (e.g., 'yellow_gold')
   * @param {string} karat - Karat (e.g., '14K')
   * @returns {Object} Pricing information for the specific metal
   */
  static async getTaskPriceForMetal(taskId, metalType, karat) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const task = await collection.findOne({ _id: new ObjectId(taskId) });
      if (!task) {
        throw new Error('Task not found');
      }
      
      // Format metal key to match pricing structure
      const metalKey = this.formatMetalKey(metalType, karat);
      
      // Check if task has universal pricing structure
      if (!task.pricing?.totalCosts) {
        throw new Error('Task does not have universal pricing structure');
      }
      
      // Get price for specific metal
      const price = task.pricing.totalCosts[metalKey];
      if (price === undefined) {
        throw new Error(`Task "${task.title}" does not support metal: ${metalKey}`);
      }
      
      return {
        taskId,
        metalKey,
        price,
        laborHours: task.pricing.baseLaborHours || 0,
        processCosts: task.pricing.processCosts || {},
        calculatedAt: task.pricing.calculatedAt
      };
    } catch (error) {
      console.error('Error getting task price for metal:', error);
      throw error;
    }
  }

  /**
   * Get all supported metals for a task
   * @param {string} taskId - Task ID
   * @returns {Array} Array of supported metal keys
   */
  static async getTaskSupportedMetals(taskId) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const task = await collection.findOne(
        { _id: new ObjectId(taskId) },
        { projection: { 'pricing.supportedMetals': 1, 'pricing.totalCosts': 1 } }
      );
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      // Return supported metals from pricing structure
      return task.pricing?.supportedMetals || Object.keys(task.pricing?.totalCosts || {});
    } catch (error) {
      console.error('Error getting task supported metals:', error);
      throw error;
    }
  }

  /**
   * Update task with universal pricing structure
   * @param {string} taskId - Task ID
   * @param {Object} universalPricing - Universal pricing object
   * @returns {Object} Updated task
   */
  static async updateTaskPricing(taskId, universalPricing) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const updatePayload = {
        pricing: universalPricing,
        updatedAt: new Date(),
        pricingLastCalculated: new Date()
      };
      
      const result = await collection.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: updatePayload }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Task not found');
      }
      
      return await this.getTaskById(taskId);
    } catch (error) {
      console.error('Error updating task pricing:', error);
      throw error;
    }
  }

  /**
   * Get tasks compatible with specific metal context
   * @param {string} metalType - Metal type
   * @param {string} karat - Karat
   * @param {Object} filters - Additional filters
   * @returns {Object} Compatible tasks with pricing for the metal
   */
  static async getTasksForMetalContext(metalType, karat, filters = {}) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      const metalKey = this.formatMetalKey(metalType, karat);
      
      // Build base query
      const query = this.buildQuery(filters);
      
      // Add metal compatibility filter
      query[`pricing.totalCosts.${metalKey}`] = { $exists: true, $gt: 0 };
      
      // Handle pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const skip = (page - 1) * limit;
      
      // Handle sorting
      const sort = {};
      if (filters.sortBy) {
        sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.title = 1;
      }
      
      const tasks = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      // Add metal-specific pricing to each task
      const tasksWithMetalPricing = tasks.map(task => ({
        ...task,
        metalContext: {
          metalType,
          karat,
          metalKey,
          price: task.pricing?.totalCosts?.[metalKey] || 0,
          laborHours: task.pricing?.baseLaborHours || 0
        }
      }));
      
      const total = await collection.countDocuments(query);
      
      return {
        tasks: tasksWithMetalPricing,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        metalContext: { metalType, karat, metalKey }
      };
    } catch (error) {
      console.error('Error getting tasks for metal context:', error);
      throw error;
    }
  }

  /**
   * Format metal type and karat into standardized key
   * @param {string} metalType - Raw metal type
   * @param {string} karat - Karat value
   * @returns {string} Formatted metal key
   */
  static formatMetalKey(metalType, karat) {
    // Convert metal type to proper case format
    const metalTypeMap = {
      'yellow_gold': 'Yellow Gold',
      'white_gold': 'White Gold',
      'rose_gold': 'Rose Gold',
      'sterling_silver': 'Sterling Silver'
    };
    
    const formattedMetal = metalTypeMap[metalType] || metalType.replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return `${formattedMetal} ${karat}`;
  }

  /**
   * Get task statistics with available filters (Enhanced for universal pricing)
   */
  static async getTaskStatistics() {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      // Main statistics - updated for universal pricing
      const [stats] = await collection.aggregate([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            withUniversalPricing: { $sum: { $cond: [{ $exists: ['$pricing.totalCosts'] }, 1, 0] } },
            // Try multiple price sources for backward compatibility
            averagePrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
            totalPrice: { $sum: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
            categories: { $addToSet: '$category' },
            supportedMetals: { $addToSet: '$pricing.supportedMetals' }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            active: 1,
            inactive: 1,
            withUniversalPricing: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            totalPrice: { $round: ['$totalPrice', 2] },
            categories: { $size: '$categories' },
            supportedMetals: 1
          }
        }
      ]).toArray();
      
      // Category statistics
      const categoryStats = await collection.aggregate([
        { $match: { isActive: { $ne: false } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
            withUniversalPricing: { $sum: { $cond: [{ $exists: ['$pricing.totalCosts'] }, 1, 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      // Metal type statistics (legacy compatibility)
      const metalTypeStats = await collection.aggregate([
        { $match: { isActive: { $ne: false }, metalType: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$metalType',
            count: { $sum: 1 },
            avgPrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      // Universal pricing statistics
      const universalPricingStats = await collection.aggregate([
        { $match: { 'pricing.totalCosts': { $exists: true } } },
        {
          $project: {
            supportedMetalCount: { $size: { $objectToArray: '$pricing.totalCosts' } },
            baseLaborHours: '$pricing.baseLaborHours',
            processCosts: '$pricing.processCosts'
          }
        },
        {
          $group: {
            _id: null,
            tasksWithUniversalPricing: { $sum: 1 },
            avgSupportedMetals: { $avg: '$supportedMetalCount' },
            avgLaborHours: { $avg: '$baseLaborHours' }
          }
        }
      ]).toArray();

      // Available filter options
      const [filtersData] = await collection.aggregate([
        {
          $group: {
            _id: null,
            categories: { $addToSet: '$category' },
            metalTypes: { $addToSet: '$metalType' }
          }
        },
        {
          $project: {
            _id: 0,
            categories: { $filter: { input: '$categories', cond: { $ne: ['$$this', null] } } },
            metalTypes: { $filter: { input: '$metalTypes', cond: { $ne: ['$$this', null] } } }
          }
        }
      ]).toArray();
      
      return {
        overview: stats || { 
          total: 0, active: 0, inactive: 0, withUniversalPricing: 0,
          averagePrice: 0, totalPrice: 0, categories: 0, supportedMetals: []
        },
        byCategory: categoryStats,
        byMetalType: metalTypeStats,
        universalPricing: universalPricingStats[0] || { 
          tasksWithUniversalPricing: 0, avgSupportedMetals: 0, avgLaborHours: 0 
        },
        filters: filtersData || { categories: [], metalTypes: [] }
      };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB query from filters (Enhanced for universal pricing)
   */
  static buildQuery(filters) {
    const query = {};
    
    console.log('🔥 MODEL - buildQuery called with filters:', filters);
    
    // Search query - enhanced to include process names
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
        { 'processes.displayName': { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }
    
    // Metal type filter - enhanced for universal pricing compatibility
    if (filters.metalType && filters.metalType !== 'all') {
      // Check both legacy metalType field and universal pricing support
      query.$or = [
        { metalType: filters.metalType },
        { [`pricing.totalCosts.${this.formatMetalKey(filters.metalType, '14K')}`]: { $exists: true } }
      ];
    }
    
    // Universal pricing filter
    if (filters.hasUniversalPricing !== undefined) {
      if (filters.hasUniversalPricing === true || filters.hasUniversalPricing === 'true') {
        query['pricing.totalCosts'] = { $exists: true };
      } else {
        query['pricing.totalCosts'] = { $exists: false };
      }
    }
    
    // Active filter - handle both boolean and string values
    if (filters.isActive !== undefined && filters.isActive !== '') {
      if (typeof filters.isActive === 'boolean') {
        query.isActive = filters.isActive;
      } else {
        query.isActive = filters.isActive === 'true';
      }
      console.log('🔥 MODEL - Active filter applied:', { filterValue: filters.isActive, queryValue: query.isActive });
    }
    
    // Price range - enhanced for universal pricing
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const priceFilter = {};
      if (filters.priceMin !== undefined) priceFilter.$gte = parseFloat(filters.priceMin);
      if (filters.priceMax !== undefined) priceFilter.$lte = parseFloat(filters.priceMax);
      
      // Check both legacy price fields and universal pricing
      query.$or = [
        { price: priceFilter },
        { basePrice: priceFilter }
      ];
      
      // If metal context is provided, check specific metal pricing
      if (filters.metalType && filters.karat) {
        const metalKey = this.formatMetalKey(filters.metalType, filters.karat);
        query.$or.push({ [`pricing.totalCosts.${metalKey}`]: priceFilter });
      }
    }
    
    console.log('🔥 MODEL - Final query built:', query);
    return query;
  }
}
