/**
 * Individual Task Service
 * Business logic layer for individual task operations.
 *
 * Responses are priced by the one engine, through the same transform as the task list
 * (TasksService.transformTaskForResponse). This service used to return the task's STORED `price` and
 * save whatever it was sent — so the task editor showed a stale price and, on every save, stored the
 * prices it had loaded right back. Calculated prices are stripped before storing, and never returned
 * from the document (services/pricing/catalog.js).
 */

import { TasksModel } from '../model';
import { TasksService } from '../service';
import { loadPricingContext, stripComputedPrices } from '@/services/pricing/catalog';

export class IndividualTaskService {
  /**
   * Get task by ID with enhanced error handling
   */
  static async getTaskById(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid task ID is required');
      }

      const [task, ctx] = await Promise.all([TasksModel.getTaskById(id), loadPricingContext()]);

      return {
        success: true,
        data: TasksService.transformTaskForResponse(task, ctx),
        message: 'Task retrieved successfully'
      };
    } catch (error) {
      console.error('Individual task service error getting task by ID:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Update task with validation and transformation
   */
  static async updateTask(id, updateData, userEmail = null) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid task ID is required');
      }

      // Validate update data
      const validation = this.validateTaskUpdateData(updateData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Transform and clean data with user tracking
      const cleanedData = {
        ...this.transformTaskForDatabase(updateData),
        updatedBy: userEmail
      };
      
      const task = await TasksModel.updateTask(id, cleanedData);

      return {
        success: true,
        data: TasksService.transformTaskForResponse(task, await loadPricingContext()),
        message: 'Task updated successfully'
      };
    } catch (error) {
      console.error('Individual task service error updating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete task with enhanced validation
   */
  static async deleteTask(id, hardDelete = false, userEmail = null) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid task ID is required');
      }

      const result = await TasksModel.deleteTask(id, hardDelete, userEmail);
      
      return {
        success: true,
        data: null,
        message: result.message
      };
    } catch (error) {
      console.error('Individual task service error deleting task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Validate task update data
   */
  static validateTaskUpdateData(data) {
    const errors = [];
    
    // Title validation (if provided)
    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('Title must be a non-empty string');
      }
    }
    
    // Category validation (if provided)
    if (data.category !== undefined) {
      if (typeof data.category !== 'string' || data.category.trim().length === 0) {
        errors.push('Category must be a non-empty string');
      }
    }
    
    // Labor hours validation (if provided)
    if (data.laborHours !== undefined) {
      const hours = parseFloat(data.laborHours);
      if (isNaN(hours) || hours < 0) {
        errors.push('Labor hours must be a valid positive number');
      }
    }
    
    // Active status validation (if provided)
    if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
      errors.push('isActive must be a boolean');
    }
    
    // SKU validation (if provided)
    if (data.sku !== undefined && typeof data.sku !== 'string') {
      errors.push('SKU must be a string');
    }
    
    // Description validation (if provided)
    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform task data for database storage
   */
  static transformTaskForDatabase(data) {
    // Calculated prices are never stored (services/pricing/catalog.js COMPUTED_PRICE_FIELDS).
    const cleaned = stripComputedPrices(data);
    delete cleaned.pricingStatus;
    delete cleaned.pricingMessage;
    delete cleaned.laborCost;

    if (cleaned.laborHours !== undefined) {
      cleaned.laborHours = parseFloat(cleaned.laborHours) || 0;
    }
    
    // Ensure boolean fields are proper booleans
    if (cleaned.isActive !== undefined) {
      cleaned.isActive = Boolean(cleaned.isActive);
    }
    
    // Trim string fields
    if (cleaned.title) cleaned.title = cleaned.title.trim();
    if (cleaned.description) cleaned.description = cleaned.description.trim();
    if (cleaned.sku) cleaned.sku = cleaned.sku.trim();
    if (cleaned.category) cleaned.category = cleaned.category.trim();
    
    // Remove empty strings and convert to null for optional fields
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });
    
    return cleaned;
  }

  /**
   * Duplicate a task by ID, creating an inactive copy
   */
  static async duplicateTask(id, userEmail = null) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid task ID is required');
      }

      const originalTask = await TasksModel.getTaskById(id);

      if (!originalTask) {
        throw new Error('Original task not found');
      }

      const {
        _id,
        id: _id2,
        createdAt,
        updatedAt,
        deletedAt,
        archivedAt,
        deletedBy,
        ...rest
      } = originalTask;
      const newTitle = `${rest.title || 'Untitled'} (Copy)`;
      let finalTitle = newTitle;
      let counter = 2;

      while (await TasksModel.taskTitleExists(finalTitle)) {
        finalTitle = `${newTitle} ${counter}`;
        counter++;
      }

      const duplicatedTask = {
        // A copy carries the recipe, never a snapshot of its price.
        ...stripComputedPrices(rest),
        title: finalTitle,
        isActive: false,
        createdBy: userEmail,
        updatedBy: userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        archivedAt: null,
        deletedBy: null
      };
      const newTask = await TasksModel.createTask(duplicatedTask);

      return {
        success: true,
        data: TasksService.transformTaskForResponse(newTask, await loadPricingContext()),
        message: 'Task duplicated successfully'
      };
    } catch (error) {
      console.error('Individual task service error duplicating task:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}
