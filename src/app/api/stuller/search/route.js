import StullerSearchController from './controller.js';
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * STAFF ONLY. Unauthenticated, this was an open proxy spending EFD's Stuller API credentials and
 * returning WHOLESALE cost data. Its sibling /api/stuller/item was already guarded — the same
 * parent/child asymmetry that hid two earlier holes.
 */

export async function GET(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return await StullerSearchController.searchItems(request);
}
