/**
 * Tasks Bulk Update Pricing API Route
 */

import { TasksController } from '../controller';

export async function POST(request) {
  return TasksController.bulkUpdatePricing(request);
}
