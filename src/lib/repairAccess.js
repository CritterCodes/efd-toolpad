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
 *
 * ─── Step 0 of the repair-page redesign ────────────────────────────────────
 *
 * The gates below were inlined in individual pages. They are moved here with
 * their conditions PRESERVED EXACTLY, one export per distinct rule, so a
 * redesign of those pages cannot quietly change who sees what.
 *
 * One deliberate change, per decision: `dev` now matches `admin` everywhere.
 * `isAdminRole` already covered both, so pages that tested `role === 'admin'`
 * directly (labor-review, ready-for-work, receiving, move, pick-up) gain dev
 * access they did not previously have. That is intended.
 *
 * NOTHING ELSE was normalised. See DIVERGENCES at the bottom for the
 * differences I found and did not resolve — each needs a decision, not a
 * tidy-up.
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
 * Onsite + repairOps, WITHOUT the artisan role check.
 *
 * `move`, `ready-for-work`, and `receiving` compute their onsite gate this way
 * — they never test the role, so any role carrying the capability flags passes.
 * `new`, `[repairID]/edit`, `pending-wholesale`, and `pick-up` DO test for
 * artisan. That inconsistency is real and predates this refactor; see
 * DIVERGENCES #1. Kept as its own export so neither behaviour is changed by
 * accident.
 */
export function hasRepairOpsCapability(session) {
  return (
    session?.user?.employment?.isOnsite === true &&
    session?.user?.staffCapabilities?.repairOps === true
  );
}

/**
 * Who may work repairs at the bench.
 *
 * From `ready-for-work/page.js` (was `isOnsiteBench`). `benchWork` is a real
 * capability layered on top of `repairOps` — a repair-ops artisan without it
 * does NOT get bench access.
 */
export function canDoBenchWork(session) {
  return (
    hasRepairOpsCapability(session) &&
    session?.user?.staffCapabilities?.benchWork === true
  );
}

/**
 * Who may take repairs in at the counter.
 *
 * From `receiving/page.js` (was `isOnsiteReceiving`). `receiving` is layered on
 * `repairOps`, same as bench work.
 */
export function canReceiveRepairs(session) {
  return (
    hasRepairOpsCapability(session) &&
    session?.user?.staffCapabilities?.receiving === true
  );
}

/**
 * Who may receive an inbound wholesale shipment.
 *
 * From `pending-wholesale/page.js` and `pending-wholesale/[storeId]/page.js`.
 * Identical capability set to `canReceiveRepairs`, but those pages additionally
 * require `role === 'artisan'`. Preserved verbatim rather than aliased — if the
 * artisan check is dropped (DIVERGENCES #1) these two collapse into one.
 */
export function canReceiveWholesale(session) {
  return (
    session?.user?.role === 'artisan' &&
    session?.user?.employment?.isOnsite === true &&
    session?.user?.staffCapabilities?.repairOps === true &&
    session?.user?.staffCapabilities?.receiving === true
  );
}

/**
 * Who may run payment and pickup closeout.
 *
 * Lifted out of `pick-up/page.js`, where it lived as a local function at line
 * 477 of an 88KB file. Either capability suffices — the API it fronts uses
 * `requireRepairOpsAny(['qualityControl','closeoutBilling'])`.
 */
export function canAccessCloseout(session) {
  return (
    isAdminRole(session) ||
    (hasRepairOpsCapability(session) &&
      (session?.user?.staffCapabilities?.closeoutBilling === true ||
        session?.user?.staffCapabilities?.qualityControl === true))
  );
}

/**
 * Who may reopen a closed invoice.
 *
 * From `pick-up/page.js` line 1441, which tested `role === "admin"` alone.
 * Now includes dev, per the dev-matches-admin decision.
 */
export function canReopenInvoices(session) {
  return isAdminRole(session);
}

/** Who may move repairs between statuses. From `move/page.js`. */
export function canMoveRepairs(session) {
  return isAdminRole(session) || hasRepairOpsCapability(session);
}

/**
 * A named capability beyond `repairOps`, for routes that demand one.
 *
 * From `move/page.js`'s local `hasCapability`. Admins and devs pass
 * unconditionally; everyone else needs the flag.
 */
export function hasNamedCapability(session, capability) {
  return (
    isAdminRole(session) ||
    session?.user?.staffCapabilities?.[capability] === true
  );
}

/**
 * Who may create a repair (the intake form).
 *
 * From `new/page.js`. Wholesalers create their own intake, so they pass.
 */
export function canCreateRepair(session) {
  return (
    isAdminRole(session) ||
    session?.user?.role === 'wholesaler' ||
    isOnsiteRepairOps(session)
  );
}

/** Who may edit an existing repair. From `[repairID]/edit/page.js`. */
export function canEditRepair(session) {
  return (
    isAdminRole(session) ||
    session?.user?.role === 'wholesaler' ||
    isOnsiteRepairOps(session)
  );
}

/**
 * Admin-only repair surfaces: labor review, payroll.
 *
 * `labor-review/page.js` tested `role !== 'admin'` and `payroll/page.js`
 * tested `['admin','dev']`. Both now resolve to admin+dev.
 */
export function canReviewLabor(session) {
  return isAdminRole(session);
}

export function canAccessPayroll(session) {
  return isAdminRole(session);
}

/**
 * Whether this viewer sees the repair through the wholesale lens.
 *
 * `[repairID]/page.js` tests `role === 'wholesaler'` inline in five separate
 * places, and `[repairID]/edit/page.js` ORs it with the record's own
 * `isWholesale` flag. Both forms are here so the detail page can adopt this
 * without changing which branch it takes.
 */
export function isWholesalerViewer(session) {
  return session?.user?.role === 'wholesaler';
}

export function isWholesaleContext(session, repair) {
  return Boolean(repair?.isWholesale || isWholesalerViewer(session));
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

/* ─── DIVERGENCES — open questions, deliberately not resolved ──────────────
 *
 * 1. THE ARTISAN CHECK IS INCONSISTENT.
 *    `move`, `ready-for-work`, and `receiving` gate on capability flags alone
 *    (`hasRepairOpsCapability`). `new`, `[repairID]/edit`, `pending-wholesale`,
 *    and `pick-up` additionally require `role === 'artisan'`.
 *
 *    Consequence: a `staff` or `wholesaler` account carrying `isOnsite` +
 *    `repairOps` can open move / ready-for-work / receiving, but not the intake
 *    form or the edit page.
 *
 *    Which is right depends on whether non-artisan accounts ever carry those
 *    capability flags. If they never do, the two forms are equivalent and the
 *    artisan check is redundant. If they do — a counter staffer with
 *    `receiving`, say — then one set of pages is wrong and it matters which.
 *    Worth a query against the user collection before deciding.
 *
 * 2. `canReceiveRepairs` vs `canReceiveWholesale` are the same capability set,
 *    differing only by #1. They merge the moment #1 is settled.
 *
 * 3. `canAccessCloseout` accepts `qualityControl` OR `closeoutBilling`. A QC-only
 *    artisan can therefore reach the invoicing screen. The API behind it agrees
 *    (`requireRepairOpsAny`), so this looks intentional — but it means QC staff
 *    can see money, which is worth confirming out loud.
 */
