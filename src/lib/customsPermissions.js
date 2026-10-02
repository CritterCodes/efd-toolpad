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

/**
 * Is this session the order's assigned CAD designer?
 *
 * Narrower than `isAssignedToOrder` on purpose. The design model — the GLB and its viewer config — is the
 * CAD designer's output, and the one write on a custom order that belongs to an artisan rather than to
 * staff. A bench jeweller or a stone cutter assigned to the same order has no business setting it.
 */
export function isAssignedCadDesigner(session, order) {
  const ids = sessionIds(session);
  return (order?.assignments || []).some((a) => a.role === 'cad' && ids.includes(a.userID));
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

/**
 * Gate the writes a CAD designer owns on a custom order. Staff always; otherwise this order's assigned
 * CAD designer. Two routes use it, for two reasons that turned out to be the same reason.
 *
 * **The design model** (`PUT .../design-model`) is the designer's output. A GLB-stage designer uploads the
 * GLB from their bench, is sent by their own bench card to `/dashboard/customs/<id>/assign-materials`, and
 * that page saves through this route. It was staff-only, so the button led to a refusal — the step between
 * "GLB uploaded" and "submit to QC" was closed to the only person it is for.
 *
 * **Communications** (`POST .../communications`). Owner, 2026-10-02: *"Cad designers can use
 * communications."* This was not only a missing convenience: `awardClientMgmtBonus` pays the designer only
 * if they authored an outbound **client-thread** message, and an artisan could not author one — so a
 * shipped, settings-configurable payout could never pay, and every completed order was stamped
 * `clientMgmtBonusAwarded: true` with zero, permanently.
 *
 * Deliberately narrower than `requireCustomsRead`: a bench jeweller or a stone cutter assigned to the same
 * order reads everything and writes neither of these.
 */
export async function requireCustomsCadWrite(customID) {
  const [{ requireAuth }, { NextResponse }, { default: CustomOrdersModel }] = await Promise.all([
    import('@/lib/apiAuth'),
    import('next/server'),
    import('@/app/api/custom-orders/model'),
  ]);
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return { session: null, errorResponse };
  if (isStaff(session)) return { session, errorResponse: null };

  const order = await CustomOrdersModel.findById(customID);
  if (order && isAssignedCadDesigner(session, order)) return { session, errorResponse: null };
  return {
    session: null,
    errorResponse: NextResponse.json(
      { error: 'Access denied — only staff or this order’s CAD designer can do that.' },
      { status: 403 },
    ),
  };
}
