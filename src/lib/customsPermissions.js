import { isStaff } from '@/lib/designPermissions';

/**
 * Customs access for artisans (owner, 2026-07-22: "give artisans full customs visibility for
 * now"). An artisan ASSIGNED to a custom order (assignments[].userID — cad/bench roles) may READ
 * everything on it: the order (incl. notes/images/quote), invoices, communications, work orders.
 * Mutations stay staff-only; artisans act through their bench work orders.
 */

const sessionIds = (session) => [session?.user?.userID, session?.user?.email].filter(Boolean);

export function isAssignedToOrder(session, order) {
  const ids = sessionIds(session);
  return (order?.assignments || []).some((a) => ids.includes(a.userID));
}

/** Mongo filter scoping a customs list to what the session may see. */
export function customsListFilter(session) {
  if (isStaff(session)) return {};
  const ids = sessionIds(session);
  return { 'assignments.userID': { $in: ids.length ? ids : ['__none__'] } };
}

/**
 * Gate a customs READ: staff always; artisans only when assigned to THIS order.
 * Returns { session, errorResponse } like requireAuth/requireRole.
 * (auth/model/next are lazy-imported so the pure helpers above stay unit-testable
 * without dragging next-auth into the test environment.)
 */
export async function requireCustomsRead(customID) {
  const [{ requireAuth }, { NextResponse }, { default: CustomOrdersModel }] = await Promise.all([
    import('@/lib/apiAuth'),
    import('next/server'),
    import('@/app/api/custom-orders/model'),
  ]);
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return { session: null, errorResponse };
  if (isStaff(session)) return { session, errorResponse: null };
  if (session.user.role === 'artisan') {
    const order = await CustomOrdersModel.findById(customID);
    if (order && isAssignedToOrder(session, order)) return { session, errorResponse: null };
  }
  return {
    session: null,
    errorResponse: NextResponse.json({ error: 'Access denied — you are not assigned to this custom order.' }, { status: 403 }),
  };
}
