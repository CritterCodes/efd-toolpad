/**
 * Tasks Service
 * Business logic layer for task management.
 *
 * PRICES ARE CALCULATED, NEVER STORED (owner, 2026-09-30). Every task returned is priced by the one
 * engine (services/pricing/engine.js, via services/pricing/catalog.js) from the live catalog and
 * settings. Nothing here writes a price: calculated fields are stripped from what's stored, and from
 * what's returned, so a stale snapshot can never be shown or saved back. This file used to carry ~600
 * lines of the alternative — a bulk price writer, the "Update Prices" recalculation, a deprecated
 * calculator with its own `wage || 30` and `materialMarkup || 1.5` fallbacks, and a per-metal price
 * map written to each task. All removed.
 */

import { TasksModel } from './model';
import { generateTaskSku, generateShortCode } from '@/utils/skuGenerator';
import { loadPricingContext, pricedTaskFields, stripComputedPrices } from '@/services/pricing/catalog';

export class TasksService {
  /**
   * Get all tasks with filtering and pagination. Throws (→ success:false) if pricing settings are
   * missing: a task list with no way to price it would only invite someone to guess.
   */
  static async getTasks(filters = {}) {
    try {
      const [result, ctx, stats, allActive] = await Promise.all([
        TasksModel.getTasks(filters),
        loadPricingContext(),
        TasksModel.getTaskStatistics(),
        TasksModel.getTasks({ isActive: true, limit: 1000 }),
      ]);
      const transformedTasks = result.tasks.map((task) => this.transformTaskForResponse(task, ctx));

      // The page's statistics and category menu (EFD-DEFECTS P25: it asked for both and got neither).
      // The average is of LIVE prices — each active task's retail, or its cheapest metal when it's
      // priced by metal — never of a stored number.
      const livePrices = (allActive.tasks || []).map((task) => {
        const f = pricedTaskFields(task, ctx);
        if (f.pricing) return f.pricing.retailPrice;
        const byMetal = Object.values(f.universalPricing || {}).map((p) => p.retailPrice);
        return byMetal.length ? Math.min(...byMetal) : null;
      }).filter((n) => n > 0);
      const overview = stats?.overview || {};

      return {
        success: true,
        data: transformedTasks,
        pagination: result.pagination,
        statistics: {
          total: overview.total || 0,
          inactive: overview.inactive || 0,
          categories: overview.categories || 0,
          averagePrice: livePrices.length ? livePrices.reduce((a, b) => a + b, 0) / livePrices.length : 0,
        },
        filters: { categories: (stats?.filters?.categories || []).slice().sort() },
        message: `Retrieved ${transformedTasks.length} tasks`
      };
    } catch (error) {
      console.error('Service error getting tasks:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      const [task, ctx] = await Promise.all([TasksModel.getTaskById(id), loadPricingContext()]);

      return {
        success: true,
        data: this.transformTaskForResponse(task, ctx),
        message: 'Task retrieved successfully'
      };
    } catch (error) {
      console.error('Service error getting task by ID:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Create a new task
   */
  static async createTask(taskData, userEmail = null) {
    try {
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const titleExists = await TasksModel.taskTitleExists(taskData.title);
      if (titleExists) {
        throw new Error('A task with this title already exists');
      }

      const shortCode = taskData.shortCode || generateShortCode(
        taskData.category,
        taskData.metalType,
        taskData.karat
      );
      const sku = taskData.sku || generateTaskSku(taskData.category, shortCode);

      const cleanedData = {
        ...this.transformTaskForDatabase(taskData),
        sku,
        shortCode,
        createdBy: userEmail,
        isActive: taskData.isActive !== false
      };

      const task = await TasksModel.createTask(cleanedData);

      return {
        success: true,
        data: this.transformTaskForResponse(task, await loadPricingContext()),
        message: 'Task created successfully'
      };
    } catch (error) {
      console.error('Service error creating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update task with enhanced validation
   */
  static async updateTask(id, updateData, userEmail = null) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      const validation = this.validateTaskData(updateData, false);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      if (updateData.title) {
        const titleExists = await TasksModel.taskTitleExists(updateData.title, id);
        if (titleExists) {
          throw new Error('A task with this title already exists');
        }
      }

      const cleanedData = {
        ...this.transformTaskForDatabase(updateData),
        updatedBy: userEmail
      };

      const task = await TasksModel.updateTask(id, cleanedData);

      return {
        success: true,
        data: this.transformTaskForResponse(task, await loadPricingContext()),
        message: 'Task updated successfully'
      };
    } catch (error) {
      console.error('Service error updating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete task with user tracking
   */
  static async deleteTask(id, hardDelete = false, userEmail = null) {
    try {
      if (!id) {
        throw new Error('Task ID is required');
      }

      const result = await TasksModel.deleteTask(id, hardDelete, userEmail);

      return {
        success: true,
        data: null,
        message: result.message
      };
    } catch (error) {
      console.error('Service error deleting task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStatistics() {
    try {
      const stats = await TasksModel.getTaskStatistics();

      return {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully'
      };
    } catch (error) {
      console.error('Service error getting task statistics:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Validate task data
   */
  static validateTaskData(data, isCreate = true) {
    const errors = [];

    if (isCreate) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('Title is required and must be a non-empty string');
      }

      if (!data.category || typeof data.category !== 'string') {
        errors.push('Category is required and must be a string');
      }
    }

    if (data.laborHours !== undefined) {
      const hours = parseFloat(data.laborHours);
      if (isNaN(hours) || hours < 0) {
        errors.push('Labor hours must be a valid positive number');
      }
    }

    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform task data for database storage. Calculated prices are stripped: the editor loads a task
   * WITH its computed prices and sends it back, and keeping them is how stale snapshots got re-stored
   * on every save. Price INPUTS (minimumPrice, minimumWholesalePrice, minimumLaborPrice, priceOverride)
   * are kept — those are the owner's settings for the task, not results.
   */
  static transformTaskForDatabase(data) {
    const cleaned = stripComputedPrices(data);
    delete cleaned.pricingStatus;
    delete cleaned.pricingMessage;
    delete cleaned.laborCost;

    if (cleaned.laborHours !== undefined) {
      cleaned.laborHours = parseFloat(cleaned.laborHours) || 0;
    }

    if (cleaned.isActive !== undefined) {
      cleaned.isActive = Boolean(cleaned.isActive);
    }

    if (cleaned.title) cleaned.title = cleaned.title.trim();
    if (cleaned.description) cleaned.description = cleaned.description.trim();
    if (cleaned.sku) cleaned.sku = cleaned.sku.trim();

    return cleaned;
  }

  /**
   * Transform a task for an API response: stored price fields removed, live ones computed.
   * @param {Object} task - Raw task from DB
   * @param {Object} ctx  - loadPricingContext() — required; a task is never returned unpriced by accident
   */
  static transformTaskForResponse(task, ctx) {
    if (!task) return null;

    return {
      ...stripComputedPrices(task),
      ...pricedTaskFields(task, ctx),
      id: task._id?.toString(),
      isActive: Boolean(task.isActive !== false),
      createdAt: task.createdAt?.toISOString?.() || task.createdAt,
      updatedAt: task.updatedAt?.toISOString?.() || task.updatedAt,
      deletedAt: task.deletedAt?.toISOString?.() || task.deletedAt
    };
  }
}
