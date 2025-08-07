/**
 * Individual Task Service
 * Business logic layer for individual task operations
 */

import { TasksModel } from '../model';

export class IndividualTaskService {
  /**
   * Get task by ID with enhanced error handling
   */
  static async getTaskById(id) {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid task ID is required');
      }

      const task = await TasksModel.getTaskById(id);
      
      return {
        success: true,
        data: this.transformTaskForResponse(task),
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
        data: this.transformTaskForResponse(task),
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
    
    // Price validation (if provided)
    if (data.price !== undefined) {
      const price = parseFloat(data.price);
      if (isNaN(price) || price < 0) {
        errors.push('Price must be a valid positive number');
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
    const cleaned = { ...data };
    
    // Convert string numbers to actual numbers
    if (cleaned.price !== undefined) {
      cleaned.price = parseFloat(cleaned.price) || 0;
    }
    
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
   * Transform task data for API response
   */
  static transformTaskForResponse(task) {
    if (!task) return null;
    
    return {
      ...task,
      id: task._id?.toString(),
      // Ensure all numeric fields are numbers
      price: typeof task.price === 'number' ? task.price : parseFloat(task.price) || 0,
      laborHours: typeof task.laborHours === 'number' ? task.laborHours : parseFloat(task.laborHours) || 0,
      // Ensure boolean fields
      isActive: Boolean(task.isActive !== false), // Default to true if not explicitly false
      // Format dates
      createdAt: task.createdAt?.toISOString?.() || task.createdAt,
      updatedAt: task.updatedAt?.toISOString?.() || task.updatedAt,
      deletedAt: task.deletedAt?.toISOString?.() || task.deletedAt
    };
  }
}
