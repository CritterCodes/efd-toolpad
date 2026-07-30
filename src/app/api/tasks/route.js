/**
 * Tasks API Routes
 * Main routes for task management using MVC structure
 */

import { TasksController } from './controller';
import { requireAuth, requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Task catalog. READS require a session, WRITES require staff.
 *
 * All of it was ANONYMOUS: the repair-task catalog and its computed pricing (EFD's labor rates and
 * markups) were readable by anyone, and POST/PUT/DELETE let anyone edit the catalog that prices
 * customer repairs. Reads are authenticated rather than staff-only because the repair intake form is
 * reachable by onsite repair-ops artisans and needs the catalog to quote.
 */

export async function GET(request) {
  const { errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  return TasksController.getTasks(request);
}

export async function POST(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return TasksController.create(request);
}

export async function PUT(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return TasksController.update(request);
}

export async function DELETE(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return TasksController.delete(request);
}
