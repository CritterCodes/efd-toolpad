/**
 * Tasks Process Controller
 * Handles specialized creation of process-based tasks
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { TasksService } from '../service';

export class TasksProcessController {
  /**
   * POST /api/tasks/process-based - Create process-based task with pricing calculations
   */
  static async createProcessBasedTask(request) {
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
}