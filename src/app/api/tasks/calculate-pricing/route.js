/**
 * Calculate universal pricing for a task (preview before save)
 * POST /api/tasks/calculate-pricing
 * Body: { processes: Process[], laborCost?: number }
 */

import { TasksController } from '../controller';
import { requireAuth, requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Guarded alongside /api/tasks — these siblings serve the same task documents and pricing.
 * Reads require a session (the repair intake form is reachable by onsite repair-ops artisans);
 * catalog WRITES require staff, matching /api/tasks and materials/bulk-update-pricing.
 */

export async function POST(request) {
  const { errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  return TasksController.calculateUniversalPricing(request);
}
