/**
 * Get tasks filtered by metal context
 * GET /api/tasks/metal-context?metalType=...&karat=...
 */

import { TasksController } from '../controller';

export async function GET(request) {
  return TasksController.getTasksForMetalContext(request);
}
