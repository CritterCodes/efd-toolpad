/**
 * Tasks Service
 * Frontend service for task management
 */

import axiosInstance from '@/utils/axiosInstance';

class TasksService {
  constructor() {
    this.baseURL = '/tasks'; // Remove /api since axiosInstance already has it
  }

  /**
   * Get all tasks with filtering and pagination
   */
  async getTasks(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await axiosInstance.get(`${this.baseURL}?${params}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load tasks');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(id) {
    try {
      const response = await axiosInstance.get(`${this.baseURL}/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load task');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error loading task:', error);
      throw error;
    }
  }

  /**
   * Create new task
   */
  async createTask(taskData) {
    try {
      const response = await axiosInstance.post(this.baseURL, taskData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create task');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update task
   */
  async updateTask(id, updateData) {
    try {
      const response = await axiosInstance.put(`${this.baseURL}/${id}`, updateData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update task');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(id, hardDelete = false) {
    try {
      const params = hardDelete ? '?hardDelete=true' : '';
      const response = await axiosInstance.delete(`${this.baseURL}/${id}${params}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete task');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics() {
    try {
      const response = await axiosInstance.get(`${this.baseURL}/statistics`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load statistics');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error loading task statistics:', error);
      throw error;
    }
  }

  /**
   * Bulk update task pricing
   */
  async bulkUpdatePricing(updates) {
    try {
      const response = await axiosInstance.post('/api/tasks/bulk-update-pricing', { updates });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update pricing');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating task pricing:', error);
      throw error;
    }
  }

  /**
   * Get tasks with pagination info
   */
  async getTasksWithPagination(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await axiosInstance.get(`${this.baseURL}?${params}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load tasks');
      }
      
      return {
        tasks: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Error loading tasks with pagination:', error);
      throw error;
    }
  }

  /**
   * Search tasks
   */
  async searchTasks(query) {
    try {
      return await this.getTasks({ search: query });
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks by category
   */
  async getTasksByCategory(category) {
    try {
      return await this.getTasks({ category });
    } catch (error) {
      console.error('Error loading tasks by category:', error);
      throw error;
    }
  }

  /**
   * Get tasks by metal type
   */
  async getTasksByMetalType(metalType) {
    try {
      return await this.getTasks({ metalType });
    } catch (error) {
      console.error('Error loading tasks by metal type:', error);
      throw error;
    }
  }

  /**
   * Get active tasks only
   */
  async getActiveTasks() {
    try {
      return await this.getTasks({ isActive: 'true' });
    } catch (error) {
      console.error('Error loading active tasks:', error);
      throw error;
    }
  }

  /**
   * Get inactive tasks only
   */
  async getInactiveTasks() {
    try {
      return await this.getTasks({ isActive: 'false' });
    } catch (error) {
      console.error('Error loading inactive tasks:', error);
      throw error;
    }
  }
}

// Export singleton instance
const tasksService = new TasksService();
export default tasksService;
