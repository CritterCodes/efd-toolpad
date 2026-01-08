/**
 * Get all compatible metals across all tasks or specific task
 * GET /api/tasks/compatible-metals?taskId=...
 */

import { TasksController } from '../controller';

export async function GET(request) {
  return TasksController.getCompatibleMetals(request);
}
