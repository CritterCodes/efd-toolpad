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

/**
 * Who may READ the pricing catalogs a repair is quoted from: the task list, the material list, the
 * admin pricing settings (wage, markups, tax rate) and Stuller item lookups.
 *
 * WHY THIS EXISTS. Those reads were gated to STAFF_ROLES while closing a genuine hole — the same
 * endpoints let any authenticated user WRITE global pricing. But `STAFF_ROLES` excludes `artisan`,
 * and an onsite repair-ops artisan IS the person standing at the counter writing up a repair. The
 * result: `getMaterials` returned 401 for them, which rejected the intake form's `Promise.all` and
 * silently discarded the task list and the wholesale-account list that had both loaded fine. Two
 * empty dropdowns, no error, no way to take in a job.
 *
 * READ IS NOT WRITE. This admits nobody to changing a price: every create/update/delete on these
 * catalogs still requires STAFF_ROLES, and the settings POST keeps its security code. Quoting a
 * repair from the catalog is the job; repricing the business is not.
 *
 * Use this for catalog READS only. Anything that mutates pricing stays on STAFF_ROLES.
 */
export function canReadPricingCatalog(session) {
  return isAdminRole(session) || isStaffRole(session) || isOnsiteRepairOps(session)
    // Wholesalers quote their own intake through the same form and already read the task catalog.
    || session?.user?.role === 'wholesaler';
}
