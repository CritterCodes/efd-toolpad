/**
 * Recalculate pricing for all tasks or specific tasks
 * POST /api/tasks/recalculate-pricing
 * Body: { taskIds?: string[] } // if not provided, recalculates all tasks
 */

import { TasksController } from '../controller';

export async function POST(request) {
  return TasksController.recalculateUniversalPricing(request);
}
