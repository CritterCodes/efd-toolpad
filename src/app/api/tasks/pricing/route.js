/**
 * Get task price for specific metal context
 * GET /api/tasks/pricing/[metalType]/[karat]?taskId=...
 */

import { TasksController } from '../controller';

export async function GET(request) {
  return TasksController.getTaskPriceForMetal(request);
}
