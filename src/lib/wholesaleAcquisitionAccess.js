/**
 * Pure: who may work the wholesale leads list.
 *
 * Separate from `lib/apiAuth.js` for the reason that file is separate from `lib/repairAccess.js` — it
 * imports next-auth, which cannot load outside a server runtime, so a predicate living there cannot
 * be tested directly. This is the decision itself; apiAuth wraps it in `requireWholesaleAcquisition`.
 *
 * Admin and dev, OR anyone holding the `wholesaleAcquisition` capability, whatever their role. The
 * owner wanted an artisan on the leads list without making him an admin, because the admin role would
 * have replaced his artisan navigation wholesale (owner, 2026-10-13).
 *
 * NOTE WHAT THIS DELIBERATELY DOES NOT REQUIRE: `employment.isOnsite`. Every other capability runs
 * through `hasStaffCapability`, which demands onsite repair-ops too — correctly, because those
 * describe what somebody may do at the bench. This one is sales work done from anywhere, and
 * borrowing the repair gate would have made the grant silently inert for an off-site holder.
 *
 * Requires a literal `true`. A capability map is written by an admin form and read by a gate; a
 * truthy string arriving from anywhere else should not open a door.
 */
export function canAccessWholesaleAcquisition(session) {
  if (['admin', 'dev'].includes(session?.user?.role)) return true;
  return session?.user?.staffCapabilities?.wholesaleAcquisition === true;
}
