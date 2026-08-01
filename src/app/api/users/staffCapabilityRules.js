/**
 * Pure rules for what a staffCapabilities document may contain.
 *
 * Separate from the route for the same reason lib/repairAccess.js is separate from lib/apiAuth.js:
 * the route imports apiAuth, which pulls in next-auth and cannot be loaded outside a server runtime.
 * Keeping the validation here means it can be tested directly — and this validation is the only thing
 * standing between an admin request and the field every repair gate reads.
 */

// The six capabilities the gates actually read. A key outside this list is REJECTED rather than
// ignored, so a typo surfaces instead of quietly granting nothing — and so the grant route can never
// be used to write arbitrary keys into a user document.
export const CAPABILITY_KEYS = Object.freeze([
  'repairOps',
  'receiving',
  'benchWork',
  'parts',
  'qualityControl',
  'closeoutBilling',
]);

/**
 * Throws on an unknown key. Returns a document containing only the capabilities explicitly set `true`.
 *
 * NOTE WHAT THIS DELIBERATELY DOES NOT DO: it does not collapse to {} when `repairOps` is absent.
 * An earlier cut did, on the reasoning that every gate requires repairOps so a sub-capability without
 * it is dead weight. That is the same argument that justified wiping capabilities when an artisan went
 * off-site — and it is wrong for the same reason, only worse here because this one reaches the
 * database.
 *
 * The failure it caused: the UI keeps sub-capability switches visibly CHECKED while disabling them
 * when repairOps is off. An admin unticking "Repair Ops" to suspend shop access still sees Bench Work
 * and Quality Control ticked, saves, and silently loses both. Re-granting Repair Ops later shows an
 * empty record with no trace of what that person was trusted to do.
 *
 * A capability the gates can't currently act on is still a RECORD worth keeping. The gates already
 * ignore sub-capabilities without repairOps (isOnsiteRepairOps requires it), so retaining them grants
 * nothing and loses nothing. Revoking a capability is the job of its own switch.
 */
export function normalizeCapabilities(input = {}) {
  const unknown = Object.keys(input).filter((key) => !CAPABILITY_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown capability: ${unknown.join(', ')}`);
  }

  const next = {};
  for (const key of CAPABILITY_KEYS) {
    if (input[key] === true) next[key] = true;
  }
  return next;
}
