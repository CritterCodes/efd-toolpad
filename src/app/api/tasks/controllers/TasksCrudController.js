/**
 * Tasks CRUD Controller
 * Handles core Create, Read, Update, Delete operations
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { TasksService } from '../service';

export class TasksCrudController {
  /**
   * GET /api/tasks - Get all tasks with filtering and pagination
   */
  static async getTasks(request) {
    try {
      const { searchParams } = new URL(request.url);

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
      const session = await auth();
      const userEmail = session?.user?.email;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const data = await request.json();

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
}