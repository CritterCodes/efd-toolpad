/**
 * Which role a new user may be created with, by whom (EFD-DEFECTS S6, 2026-09-30).
 *
 * POST /api/users took `role` straight from the body, and the client form used at intake offered
 * "Admin" beside Customer and Wholesaler. The form is fixed, but the form was never the guard: any
 * account in STAFF_ROLES could post `role: 'admin'` and get an admin. So the rule lives here:
 *
 *   - a privileged role (admin, superadmin, dev, staff) can only be granted by an admin or dev
 *   - a role the system doesn't know is refused, rather than stored and later misread
 *   - no role means a customer
 *
 * In production today only two accounts are admins and none hold `staff`/`dev`/`superadmin`, so
 * nothing anyone does now changes — this closes the path before someone new can use it.
 */

export const PRIVILEGED_ROLES = Object.freeze(['admin', 'superadmin', 'dev', 'staff']);

/** Every role a user document may carry (production holds all but the privileged four's rarer ones). */
export const KNOWN_ROLES = Object.freeze([
  'customer', 'client', 'wholesaler', 'artisan', 'affiliate',
  ...PRIVILEGED_ROLES,
]);

const GRANTORS = new Set(['admin', 'dev']);

/**
 * Pure: `{ role }` to create with, or `{ error, status }` to refuse.
 */
export function resolveCreatableRole(requestedRole, actorRole) {
  const role = String(requestedRole ?? '').trim().toLowerCase() || 'customer';
  if (!KNOWN_ROLES.includes(role)) return { error: `Unknown role "${role}".`, status: 400 };
  if (PRIVILEGED_ROLES.includes(role) && !GRANTORS.has(String(actorRole || ''))) {
    return { error: 'Only an admin can create an account with that role.', status: 403 };
  }
  return { role };
}
