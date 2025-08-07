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
          updateFields.archivedBy = userEmail;
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
   * Get task statistics with available filters
   */
  static async getTaskStatistics() {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      
      // Main statistics
      const [stats] = await collection.aggregate([
        { $match: {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            averagePrice: { $avg: { $ifNull: ['$basePrice', '$price'] } }, // Use basePrice if available
            totalPrice: { $sum: { $ifNull: ['$basePrice', '$price'] } },
            categories: { $addToSet: '$category' }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            active: 1,
            inactive: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            totalPrice: { $round: ['$totalPrice', 2] },
            categories: { $size: '$categories' }
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
            avgPrice: { $avg: { $ifNull: ['$basePrice', '$price'] } }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();
      
      // Metal type statistics
      const metalTypeStats = await collection.aggregate([
        { $match: { isActive: { $ne: false }, metalType: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$metalType',
            count: { $sum: 1 },
            avgPrice: { $avg: { $ifNull: ['$basePrice', '$price'] } }
          }
        },
        { $sort: { count: -1 } }
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
        overview: stats || { total: 0, active: 0, inactive: 0, averagePrice: 0, totalPrice: 0, categories: 0 },
        byCategory: categoryStats,
        byMetalType: metalTypeStats,
        filters: filtersData || { categories: [], metalTypes: [] }
      };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB query from filters
   */
  static buildQuery(filters) {
    const query = {};
    
    console.log('🔥 MODEL - buildQuery called with filters:', filters);
    
    // Search query
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }
    
    // Metal type filter
    if (filters.metalType && filters.metalType !== 'all') {
      query.metalType = filters.metalType;
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
    
    // Price range
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      query.price = {};
      if (filters.priceMin !== undefined) query.price.$gte = parseFloat(filters.priceMin);
      if (filters.priceMax !== undefined) query.price.$lte = parseFloat(filters.priceMax);
    }
    
    console.log('🔥 MODEL - Final query built:', query);
    return query;
  }
}
