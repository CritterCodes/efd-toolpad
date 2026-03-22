/**
 * Tasks Pricing Controller
 * Handles operations related to pricing calculation, bulk updates, and recalculation
 */

import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { TasksService } from '../service';

export class TasksPricingController {
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
   * POST /api/tasks/update-prices - Recalculate and update all task prices
   */
  static async updateAllPrices(request) {
    try {
      console.log('🔥 CONTROLLER - updateAllPrices called at:', new Date().toISOString());
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
        result = await TasksService.recalculateUniversalPricingForTasks(taskIds, userEmail);
      } else {
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