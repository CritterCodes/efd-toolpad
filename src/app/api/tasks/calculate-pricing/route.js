/**
 * Calculate universal pricing for a task (preview before save)
 * POST /api/tasks/calculate-pricing
 * Body: { processes: Process[], laborCost?: number }
 */

import { TasksController } from '../controller';

export async function POST(request) {
  return TasksController.calculateUniversalPricing(request);
}
