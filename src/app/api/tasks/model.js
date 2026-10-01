/**
 * Tasks Model
 * Database operations for task management
 */

import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import Constants from '@/lib/constants';
import { buildQuery, formatMetalKey } from './queries.js';
import { getTaskStatisticsAggregation } from './aggregations.js';

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

      await db.connect();
      const collection = db._instance.collection(this.collectionName);

      const query = this.buildQuery(filters);

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


      const tasks = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();


      const total = await collection.countDocuments(query);

      const result = {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };


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
  // ARCHIVE ONLY (EFD-DEFECTS P21). `hardDelete` is ignored: a permanently deleted task left every
  // repair ticket that used it pointing at nothing. Archived tasks keep their history and can be revived.
  static async deleteTask(id, _hardDelete = false, userEmail = null) {
    try {
      await db.connect();
      const collection = db._instance.collection(this.collectionName);

      {
        const updateFields = {
          isActive: false,
          'display.isActive': false,
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
