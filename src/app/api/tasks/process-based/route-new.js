/**
 * Tasks Process-Based Creation API Route
 */

import { TasksController } from '../controller';

export async function POST(request) {
  return TasksController.createProcessBasedTask(request);
}
