/**
 * Individual Task Controller
 * HTTP request handlers for individual task operations (GET, PUT, DELETE by ID)
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { IndividualTaskService } from './service';

export class IndividualTaskController {
  /**
   * GET /api/tasks/[id] - Get task by ID
   */
  static async getTask(request, { params }) {
    try {
      const { id } = params;
      
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required', data: null },
          { status: 400 }
        );
      }
      
      const result = await IndividualTaskService.getTaskById(id);
      
      if (!result.success) {
        const statusCode = result.error.includes('not found') ? 404 : 500;
        return NextResponse.json(result, { status: statusCode });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error getting task by ID:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', data: null },
        { status: 500 }
      );
    }
  }

  /**
   * PUT /api/tasks/[id] - Update task
   */
  static async updateTask(request, { params }) {
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

      const { id } = params;
      
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required', data: null },
          { status: 400 }
        );
      }
      
      const updateData = await request.json();
      
      const result = await IndividualTaskService.updateTask(id, updateData, userEmail);
      
      if (!result.success) {
        const statusCode = result.error.includes('not found') ? 404 : 400;
        return NextResponse.json(result, { status: statusCode });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error updating task:', error);
      
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
   * DELETE /api/tasks/[id] - Delete task
   */
  static async deleteTask(request, { params }) {
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

      const { id } = params;
      
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Task ID is required', data: null },
          { status: 400 }
        );
      }
      
      const { searchParams } = new URL(request.url);
      const hardDelete = searchParams.get('hardDelete') === 'true';
      
      const result = await IndividualTaskService.deleteTask(id, hardDelete, userEmail);
      
      if (!result.success) {
        const statusCode = result.error.includes('not found') ? 404 : 500;
        return NextResponse.json(result, { status: statusCode });
      }
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Controller error deleting task:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', data: null },
        { status: 500 }
      );
    }
  }
}
