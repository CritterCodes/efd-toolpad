/**
 * Tasks Analytics Controller
 * Handles statistical query operations for tasks
 */

import { NextResponse } from 'next/server';
import { TasksService } from '../service';

export class TasksAnalyticsController {
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
}