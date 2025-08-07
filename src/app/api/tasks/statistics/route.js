/**
 * Tasks Statistics API Route
 */

import { TasksController } from '../controller';

export async function GET(request) {
  return TasksController.getStatistics(request);
}
