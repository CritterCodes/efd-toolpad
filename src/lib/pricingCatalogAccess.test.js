import { describe, it, expect } from 'vitest';
import { canReadPricingCatalog, isOnsiteRepairOps } from './repairAccess';
import { STAFF_ROLES } from './designPermissions';

/**
 * INCIDENT, 2026-08-10: an onsite artisan could not select a wholesale account or a task when writing
 * up a repair.
 *
 * Cause: a security sweep gated the pricing catalogs (materials, admin settings, Stuller lookups) to
 * STAFF_ROLES while closing a real hole — those endpoints let any authenticated user WRITE global
 * pricing. But STAFF_ROLES is ['admin','superadmin','dev','staff'] and does NOT include 'artisan',
 * and an onsite repair-ops artisan is precisely the person at the counter taking the job in.
 *
 * What made it hard to diagnose: `getMaterials` returned 401, which rejected the intake form's
 * Promise.all, which DISCARDED the task list and wholesale-account list that had both returned 200.
 * The failing request and the visible symptom were in different places.
 *
 * These tests pin who may READ a pricing catalog. The rule they must never drift into is "STAFF_ROLES
 * only", because that is the exact regression.
 */

const user = (over) => ({ user: { role: 'artisan', employment: { isOnsite: true }, staffCapabilities: { repairOps: true }, ...over } });

describe('canReadPricingCatalog', () => {
  it('admits the onsite repair-ops artisan — the person writing up the repair', () => {
    expect(canReadPricingCatalog(user())).toBe(true);
  });

  it('admits every staff role', () => {
    for (const role of STAFF_ROLES) {
      expect(canReadPricingCatalog({ user: { role } })).toBe(true);
    }
  });

  it('admits wholesalers — they quote their own intake on the same form', () => {
    // The pre-sweep gate (email.includes('@')) passed them, so gating to STAFF_ROLES broke their
    // intake form too; it just hadn't been reported yet.
    expect(canReadPricingCatalog({ user: { role: 'wholesaler' } })).toBe(true);
  });

  it('is strictly WIDER than STAFF_ROLES — the regression was gating reads to staff', () => {
    const artisan = user();
    expect(STAFF_ROLES.includes(artisan.user.role)).toBe(false);
    expect(canReadPricingCatalog(artisan)).toBe(true);
  });

  it('refuses a client, and an artisan who is not onsite repair-ops', () => {
    expect(canReadPricingCatalog({ user: { role: 'client' } })).toBe(false);
    // Offsite artisan: has the capability but is not in the shop.
    expect(canReadPricingCatalog(user({ employment: { isOnsite: false } }))).toBe(false);
    // Onsite but not cleared for repair work.
    expect(canReadPricingCatalog(user({ staffCapabilities: {} }))).toBe(false);
  });

  it('refuses an unauthenticated caller', () => {
    expect(canReadPricingCatalog(null)).toBe(false);
    expect(canReadPricingCatalog({})).toBe(false);
    expect(canReadPricingCatalog({ user: {} })).toBe(false);
  });

  it('agrees with isOnsiteRepairOps about who the onsite artisan is', () => {
    // One definition of "onsite repair ops", not two — the drift this module exists to prevent.
    const artisan = user();
    expect(isOnsiteRepairOps(artisan)).toBe(true);
    expect(canReadPricingCatalog(artisan)).toBe(true);
  });
});
