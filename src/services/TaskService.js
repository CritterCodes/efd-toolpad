/**
 * TaskService.js - Frontend service for universal task operations
 * 
 * Handles all task-related API calls with universal pricing support.
 * Provides clean interface for task operations with metal context awareness.
 */

export class TaskService {
  static baseUrl = '/api/tasks';

  /**
   * Get task price for specific metal context
   */
  static async getTaskPriceForMetal(taskId, metalType, karat) {
    try {
      const response = await fetch(
        `${this.baseUrl}/pricing?taskId=${taskId}&metalType=${metalType}&karat=${karat}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get task price: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.getTaskPriceForMetal error:', error);
      throw error;
    }
  }

  /**
   * Calculate universal pricing for task (preview mode)
   */
  static async calculateTaskPricing(taskData) {
    try {
      const response = await fetch(`${this.baseUrl}/calculate-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to calculate pricing: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.calculateTaskPricing error:', error);
      throw error;
    }
  }

  /**
   * Get all compatible metals for a task
   */
  static async getCompatibleMetals(taskId = null) {
    try {
      const url = taskId 
        ? `${this.baseUrl}/compatible-metals?taskId=${taskId}`
        : `${this.baseUrl}/compatible-metals`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get compatible metals: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.getCompatibleMetals error:', error);
      throw error;
    }
  }

  /**
   * Get tasks filtered by metal context
   */
  static async getTasksForMetalContext(metalType, karat) {
    try {
      const response = await fetch(
        `${this.baseUrl}/metal-context?metalType=${metalType}&karat=${karat}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get tasks for metal context: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.getTasksForMetalContext error:', error);
      throw error;
    }
  }

  /**
   * Create new task with universal pricing
   */
  static async createTask(taskData) {
    try {
      // First calculate universal pricing
      const pricingData = await this.calculateTaskPricing({
        processes: taskData.processes,
        laborCost: taskData.laborCost
      });

      // Create task with universal pricing included
      const taskWithPricing = {
        ...taskData,
        pricing: pricingData.universalPricing,
        supportedMetals: pricingData.supportedMetals,
        universalTask: true
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskWithPricing)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.createTask error:', error);
      throw error;
    }
  }

  /**
   * Update existing task and recalculate pricing if processes changed
   */
  static async updateTask(taskId, taskData) {
    try {
      // If processes changed, recalculate universal pricing
      if (taskData.processes) {
        const pricingData = await this.calculateTaskPricing({
          processes: taskData.processes,
          laborCost: taskData.laborCost
        });

        taskData.pricing = pricingData.universalPricing;
        taskData.supportedMetals = pricingData.supportedMetals;
      }

      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.updateTask error:', error);
      throw error;
    }
  }

  /**
   * Get all tasks
   */
  static async getTasks() {
    try {
      const response = await fetch(this.baseUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to get tasks: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.getTasks error:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  static async deleteTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.deleteTask error:', error);
      throw error;
    }
  }

  /**
   * Recalculate pricing for tasks (bulk operation)
   */
  static async recalculateTasksPricing(taskIds = null) {
    try {
      const body = taskIds ? { taskIds } : {};
      
      const response = await fetch(`${this.baseUrl}/recalculate-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to recalculate pricing: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('TaskService.recalculateTasksPricing error:', error);
      throw error;
    }
  }
}
