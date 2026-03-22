/**
 * Tasks Metal Context Controller
 * Handles operations related to metals, compatible metals, and metal context task retrieval
 */

import { NextResponse } from 'next/server';
import { TasksService } from '../service';

export class TasksMetalController {
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
        result = await TasksService.getTaskSupportedMetals(taskId);
      } else {
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
}