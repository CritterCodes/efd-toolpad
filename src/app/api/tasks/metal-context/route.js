/**
 * Get tasks filtered by metal context
 * GET /api/tasks/metal-context?metalType=...&karat=...
 */

import { TasksController } from '../controller';
import { requireAuth, requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Guarded alongside /api/tasks — these siblings serve the same task documents and pricing.
 * Reads require a session (the repair intake form is reachable by onsite repair-ops artisans);
 * catalog WRITES require staff, matching /api/tasks and materials/bulk-update-pricing.
 */

export async function GET(request) {
  const { errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  return TasksController.getTasksForMetalContext(request);
}
