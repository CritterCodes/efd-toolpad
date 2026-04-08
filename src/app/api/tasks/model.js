/**
 * Tasks Model
 * Database operations for task management
 */

import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import Constants from '@/lib/constants';
import { buildQuery, formatMetalKey } from './queries.js';
import { getTaskStatisticsAggregation } from './aggregations.js';
import {
  getTaskPriceForMetalStr,
  getTaskSupportedMetalsStr,
  updateTaskPricingStr,
  getTasksForMetalContextStr
} from './pricing.js';

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
      console.log('í´¥ MODEL - getTasks called with filters:', filters);

      await db.connect();
      const collection = db._instance.collection(this.collectionName);
      console.log('í´¥ MODEL - Connected to collection:', this.collectionName);

      const query = this.buildQuery(filters);
      console.log('í´¥ MODEL - Query to execute:', query);

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

      console.log('í´¥ MODEL - Pagination and sort:', { page, limit, skip, sort });

      const tasks = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      console.log('í´¥ MODEL - Tasks found:', {
        count: tasks.length,
        sampleTitles: tasks.slice(0, 3).map(t => t.title)
      });

      const total = await collection.countDocuments(query);
      console.log('í´¥ MODEL - Total documents matching query:', total);

      const result = {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      console.log('í´¥ MODEL - Returning result:', {
        tasksCount: result.tasks.length,
        paginationTotal: result.pagination.total
      });

      return result;
    } catch (error) {
      console.error('í´¥ MODEL - Error getting tasks:', error);
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
   */
  static async getTaskPriceForMetal(taskId, metalType, karat) {
    return getTaskPriceForMetalStr(taskId, metalType, karat);
  }

  /**
   * Get all supported metals for a task
   */
  static async getTaskSupportedMetals(taskId) {
    return getTaskSupportedMetalsStr(taskId);
  }

  /**
   * Update task with universal pricing structure
   */
  static async updateTaskPricing(taskId, universalPricing) {
    return updateTaskPricingStr(taskId, universalPricing);
  }

  /**
   * Get tasks compatible with specific metal context
   */
  static async getTasksForMetalContext(metalType, karat, filters = {}) {
    return getTasksForMetalContextStr(metalType, karat, filters);
  }

  /**
   * Format metal type and karat into standardized key
   */
  static formatMetalKey(metalType, karat) {
    return formatMetalKey(metalType, karat);
  }

  /**
   * Get task statistics with available filters
   */
  static async getTaskStatistics() {
    return getTaskStatisticsAggregation();
  }

  /**
   * Build MongoDB query from filters
   */
  static buildQuery(filters) {
    return buildQuery(filters);
  }
}
