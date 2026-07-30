import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Guarded alongside /api/tasks — same task documents and pricing. Reads need a session; catalog
 * WRITES need staff, matching /api/tasks and materials/bulk-update-pricing.
 */

export async function POST() {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  return NextResponse.json({
    success: true,
    updated: 0,
    message: 'Task pricing is now computed at runtime — no bulk update needed.'
  });
}
