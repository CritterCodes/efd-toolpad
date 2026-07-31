/**
 * Pure role predicates for repair work, safe to import from client components.
 *
 * `apiAuth.js` pulls in `@/lib/auth` and `NextResponse`, so a page cannot import
 * from it without dragging server code into the browser bundle. The alternative
 * — retyping the same role test inside each page — is exactly the divergence
 * designPermissions.js warns about, where a role ends up staff in one gate and
 * not another. So the predicates live here and apiAuth consumes them.
 *
 * Nothing in this file touches a request, a session store, or the database. It
 * only answers questions about a session object it is handed.
 */

/** Admins and devs. */
export function isAdminRole(session) {
  return ['admin', 'dev'].includes(session?.user?.role);
}

/** Counter and bench staff who are not artisans. */
export function isStaffRole(session) {
  return ['staff', 'superadmin'].includes(session?.user?.role);
}

/** An artisan physically in the shop, cleared for repair operations. */
export function isOnsiteRepairOps(session) {
  return (
    session?.user?.role === 'artisan' &&
    session?.user?.employment?.isOnsite === true &&
    session?.user?.staffCapabilities?.repairOps === true
  );
}

/**
 * Who may see and act on retail repair leads — quoting them, and converting
 * them once the piece is dropped off.
 *
 * Deliberately excludes wholesalers. They pass `canAccessRepairs` because they
 * have their own repairs in the system, but retail leads are other people's
 * customers and none of their business.
 */
export function canAccessLeads(session) {
  return isAdminRole(session) || isStaffRole(session) || isOnsiteRepairOps(session);
}
