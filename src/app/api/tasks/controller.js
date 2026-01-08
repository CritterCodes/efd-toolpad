/**
 * Tasks Controller
 * HTTP request handlers for task management
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { TasksService } from './service';

export class TasksController {
  /**
   * GET /api/tasks - Get all tasks with filtering and pagination
   */
  static async getTasks(request) {
    try {
      const { searchParams } = new URL(request.url);
      
      // Check for single task request (for CRUD route compatibility)
      const taskId = searchParams.get('taskId');
      if (taskId) {
        const result = await TasksService.getTaskById(taskId);
        
        if (!result.success) {
          const statusCode = result.error.includes('not found') ? 404 : 500;
          return NextResponse.json({ error: result.error }, { status: statusCode });
        }
        
        return NextResponse.json({
          success: true,
          task: result.data
        });
      }
      
      const filters = {
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search'),
        category: searchParams.get('category'),
        metalType: searchParams.get('metalType'),
        isActive: searchParams.get('isActive'),
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder'),
        priceMin: searchParams.get('priceMin'),
        priceMax: searchParams.get('priceMax')
      };
      
      // Remove null/undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined) {
          delete filters[key];
        }
      });
      
      const result = await TasksService.getTasks(filters);
      
      if (!result.success) {
        return NextResponse.json(result, { status: 500 });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error getting tasks:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', data: [] },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks - Create a new task
   */
  static async create(request) {
    try {
      // Get user session for audit tracking
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const data = await request.json();
      
      // If processes are provided but no universal pricing, calculate it
      if (data.processes && data.processes.length > 0 && !data.pricing) {
        try {
          const universalPricing = await TasksService.calculateUniversalTaskPricing({
            processes: data.processes,
            laborCost: data.laborCost || data.service?.laborCost || 0
          });
          
          data.pricing = universalPricing;
          data.universalTask = true;
          data.supportedMetals = Object.keys(universalPricing).map(metalKey => {
            const [metalType, karat] = metalKey.split('_');
            return { metalType, karat };
          });
        } catch (pricingError) {
          console.warn('Failed to calculate universal pricing:', pricingError.message);
          // Continue with task creation without pricing if calculation fails
        }
      }
      
      const task = await TasksService.createTask(data, userEmail);
      
      return NextResponse.json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * PUT/PATCH /api/tasks - Update a task
   */
  static async update(request) {
    try {
      // Get user session for audit tracking
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { taskId, ...data } = await request.json();
      
      if (!taskId) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required for update' },
          { status: 400 }
        );
      }

      // If processes are being updated, recalculate universal pricing
      if (data.processes && data.processes.length > 0) {
        try {
          const universalPricing = await TasksService.calculateUniversalTaskPricing({
            processes: data.processes,
            laborCost: data.laborCost || data.service?.laborCost || 0
          });
          
          data.pricing = universalPricing;
          data.universalTask = true;
          data.supportedMetals = Object.keys(universalPricing).map(metalKey => {
            const [metalType, karat] = metalKey.split('_');
            return { metalType, karat };
          });
        } catch (pricingError) {
          console.warn('Failed to recalculate universal pricing:', pricingError.message);
          // Continue with task update even if pricing calculation fails
        }
      }

      const task = await TasksService.updateTask(taskId, data, userEmail);
      
      return NextResponse.json({
        success: true,
        data: task,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      
      if (error.message === 'Task not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * DELETE /api/tasks - Delete a task
   */
  static async delete(request) {
    try {
      // Get user session for audit tracking
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { taskId, hardDelete = false } = await request.json();
      
      if (!taskId) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required' },
          { status: 400 }
        );
      }

      const result = await TasksService.deleteTask(taskId, hardDelete, userEmail);
      
      if (!result.success) {
        const statusCode = result.error.includes('not found') ? 404 : 500;
        return NextResponse.json(result, { status: statusCode });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/tasks/statistics - Get task statistics
   */
  static async getStatistics(request) {
    try {
      const result = await TasksService.getTaskStatistics();
      
      if (!result.success) {
        return NextResponse.json(result, { status: 500 });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error getting task statistics:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', data: null },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks/bulk-update-pricing - Bulk update task pricing
   */
  static async bulkUpdatePricing(request) {
    try {
      const { updates } = await request.json();
      
      if (!Array.isArray(updates)) {
        return NextResponse.json(
          { success: false, error: 'Updates must be an array', data: null },
          { status: 400 }
        );
      }
      
      const result = await TasksService.bulkUpdatePricing(updates);
      
      if (!result.success) {
        return NextResponse.json(result, { status: 500 });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error in bulk update pricing:', error);
      
      if (error.message.includes('JSON')) {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON in request body', data: null },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Internal server error', data: null },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks/process-based - Create process-based task with pricing calculations
   */
  static async createProcessBasedTask(request) {
    try {
      // Get user session for audit tracking
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const data = await request.json();
      const task = await TasksService.createProcessBasedTask(data, userEmail);
      
      return NextResponse.json({
        success: true,
        data: task,
        message: 'Process-based task created successfully'
      });
    } catch (error) {
      console.error('Error creating process-based task:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks/update-prices - Recalculate and update all task prices
   */
  static async updateAllPrices(request) {
    try {
      console.log('🔥 CONTROLLER - updateAllPrices called at:', new Date().toISOString());
      
      // Get user session for audit tracking
      const session = await auth();
      const userEmail = session?.user?.email;

      console.log('🔥 CONTROLLER - Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: userEmail || 'none',
        authenticated: !!userEmail
      });

      if (!userEmail) {
        console.log('🔥 CONTROLLER - Authentication failed, no user email');
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      console.log(`🔥 CONTROLLER - Starting bulk price update requested by: ${userEmail}`);
      console.log('🔥 CONTROLLER - Calling TasksService.recalculateAllTaskPrices...');

      const result = await TasksService.recalculateAllTaskPrices();
      
      console.log('🔥 CONTROLLER - Service call completed:', {
        success: result?.success,
        hasData: !!result?.data,
        dataKeys: result?.data ? Object.keys(result.data) : 'none',
        message: result?.message,
        error: result?.error
      });
      
      if (!result.success) {
        console.log('🔥 CONTROLLER - Service returned failure:', result);
        return NextResponse.json(result, { status: 500 });
      }

      console.log(`🔥 CONTROLLER - Bulk price update completed successfully:`, result.data);

      return NextResponse.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('🔥 CONTROLLER - Critical error updating all prices:', {
        error: error.message,
        stack: error.stack?.substring(0, 500),
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * GET /api/tasks/[id]/pricing/[metalType]/[karat] - Get task price for specific metal context
   */
  static async getTaskPriceForMetal(request) {
    try {
      const { searchParams } = new URL(request.url);
      const taskId = searchParams.get('taskId');
      const metalType = searchParams.get('metalType');
      const karat = searchParams.get('karat');

      if (!taskId || !metalType || !karat) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: taskId, metalType, karat' },
          { status: 400 }
        );
      }

      const result = await TasksService.getTaskPriceForMetal(taskId, metalType, karat);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Task pricing retrieved for metal context'
      });
    } catch (error) {
      console.error('Error getting task price for metal:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json(
        { success: false, error: error.message },
        { status: statusCode }
      );
    }
  }

  /**
   * GET /api/tasks/compatible-metals - Get all supported metal types
   */
  static async getCompatibleMetals(request) {
    try {
      const { searchParams } = new URL(request.url);
      const taskId = searchParams.get('taskId');

      let result;
      if (taskId) {
        // Get supported metals for specific task
        result = await TasksService.getTaskSupportedMetals(taskId);
      } else {
        // Get all supported metals across all tasks
        result = await TasksService.getAllSupportedMetals();
      }
      
      return NextResponse.json({
        success: true,
        data: result,
        message: taskId ? 'Task supported metals retrieved' : 'All supported metals retrieved'
      });
    } catch (error) {
      console.error('Error getting compatible metals:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json(
        { success: false, error: error.message },
        { status: statusCode }
      );
    }
  }

  /**
   * GET /api/tasks/metal-context - Get tasks compatible with metal context
   */
  static async getTasksForMetalContext(request) {
    try {
      const { searchParams } = new URL(request.url);
      const metalType = searchParams.get('metalType');
      const karat = searchParams.get('karat');

      if (!metalType || !karat) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: metalType, karat' },
          { status: 400 }
        );
      }

      const filters = {
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search'),
        category: searchParams.get('category'),
        isActive: searchParams.get('isActive'),
        sortBy: searchParams.get('sortBy'),
        sortOrder: searchParams.get('sortOrder')
      };

      // Remove null/undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await TasksService.getTasksForMetalContext(metalType, karat, filters);
      
      return NextResponse.json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
        metalContext: result.metalContext,
        message: `Tasks retrieved for ${metalType} ${karat}`
      });
    } catch (error) {
      console.error('Error getting tasks for metal context:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks/recalculate-pricing - Recalculate universal pricing for tasks
   */
  static async recalculateUniversalPricing(request) {
    try {
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { taskIds } = await request.json();

      let result;
      if (taskIds && taskIds.length > 0) {
        // Recalculate specific tasks
        result = await TasksService.recalculateUniversalPricingForTasks(taskIds, userEmail);
      } else {
        // Recalculate all tasks
        result = await TasksService.recalculateAllUniversalPricing(userEmail);
      }
      
      return NextResponse.json({
        success: true,
        data: result,
        message: taskIds ? 'Selected tasks pricing recalculated' : 'All tasks pricing recalculated'
      });
    } catch (error) {
      console.error('Error recalculating universal pricing:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/tasks/calculate-universal-pricing - Calculate universal pricing for task data
   */
  static async calculateUniversalPricing(request) {
    try {
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const taskData = await request.json();
      
      const result = await TasksService.calculateUniversalTaskPricing(taskData);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Universal pricing calculated successfully'
      });
    } catch (error) {
      console.error('Error calculating universal pricing:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
}
