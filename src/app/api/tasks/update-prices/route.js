import { TasksController } from '../controller.js';

/**
 * POST /api/tasks/update-prices - Bulk update all task prices
 */
export async function POST(request) {
  return TasksController.updateAllPrices(request);
}
