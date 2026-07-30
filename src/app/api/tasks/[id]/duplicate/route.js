/**
 * Task Duplicate Route
 * POST /api/tasks/[id]/duplicate — Creates an inactive copy of the given task
 */

import { IndividualTaskController } from '../controller';
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Guarded alongside /api/tasks — same task documents and pricing. Reads need a session; catalog
 * WRITES need staff, matching /api/tasks and materials/bulk-update-pricing.
 */

export async function POST(request, { params }) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return IndividualTaskController.duplicateTask(request, { params });
}
