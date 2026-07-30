import { describe, it, expect } from 'vitest';
import { USER_SECRET_FIELDS, USER_PRIVILEGE_FIELDS, stripPrivilegeFields } from '@/app/api/users/model';

/**
 * User-document CREDENTIAL and PRIVILEGE boundaries.
 *
 * Both of these were live at `3d78852`, after two commits had already claimed to close the app's
 * role-escalation and PII holes.
 *
 * 1. ACCOUNT TAKEOVER. Every read in `users/model.js` used a bare `findOne`/`find` with no projection,
 *    and a user doc carries the bcrypt `password` plus a live `resetToken`. Chain:
 *      anonymous forgot-password (plants a 1h resetToken) → ANY signed-in user reads it via
 *      GET /api/users?query=<email> → anonymous reset-password → account owned.
 *    The projection is the fix, applied at the MODEL layer because route-by-route auditing is exactly
 *    what let this survive.
 *
 * 2. STAFF→ADMIN. `/api/users/[userID]` stripped privilege fields; its `?query=` sibling did not. A
 *    `staff` account (denied `adminSettings`, the permission create-admin checks before granting admin)
 *    could not create an admin through the guarded route but could promote ITSELF through the other one.
 *    The strip is now shared so they cannot drift again.
 */

describe('USER_SECRET_FIELDS — credentials never leave the DB on a read', () => {
  it('excludes every credential a users doc carries', () => {
    for (const f of ['password', 'resetToken', 'resetTokenExpiry', 'verificationToken']) {
      expect(USER_SECRET_FIELDS[f], `${f} must be projected out`).toBe(0);
    }
  });

  it('is an EXCLUSION projection — a new schema field is exposed by default, never a credential', () => {
    // All-zero values: Mongo returns everything except these. An inclusion projection would silently
    // drop new fields and break callers, which is the failure mode that invites removing it.
    expect(Object.values(USER_SECRET_FIELDS).every((v) => v === 0)).toBe(true);
  });

  it('is frozen, so a caller cannot mutate the shared projection', () => {
    expect(Object.isFrozen(USER_SECRET_FIELDS)).toBe(true);
  });
});

describe('stripPrivilegeFields', () => {
  it('drops role and every other privilege field', () => {
    const out = stripPrivilegeFields({
      role: 'admin', password: 'x', status: 'verified', emailVerified: true,
      staffCapabilities: { repairOps: true }, mustChangePassword: false,
      resetToken: 't', permissions: ['all'],
      firstName: 'Legit', compensationProfile: { rate: 25 },
    });
    for (const f of USER_PRIVILEGE_FIELDS) expect(out[f], `${f} must be stripped`).toBeUndefined();
    expect(out.firstName).toBe('Legit');
    expect(out.compensationProfile).toEqual({ rate: 25 });
  });

  it('drops DOTTED keys targeting a privileged subdocument', () => {
    // The exact-key delete this replaced missed these entirely: Mongo treats `{"a.b":1}` as a targeted
    // $set INTO the subdocument, so repairOps/closeoutBilling (which gate money operations) could be
    // granted while the payload looked untouched.
    const out = stripPrivilegeFields({
      'staffCapabilities.repairOps': true,
      'staffCapabilities.closeoutBilling': true,
      'role.x': 1,
      'password.y': 'z',
      'compensationProfile.rate': 30,
    });
    expect(Object.keys(out)).toEqual(['compensationProfile.rate']);
  });

  it('does not pass prototype-polluting keys into the $set payload', () => {
    // Assert OWN properties: `constructor` is inherited from Object.prototype, so `out.constructor`
    // is never undefined — only `hasOwnProperty` says whether it would reach Mongo's $set.
    const out = stripPrivilegeFields(JSON.parse('{"__proto__":{"role":"admin"},"constructor":1,"prototype":1,"ok":2}'));
    for (const k of ['__proto__', 'constructor', 'prototype']) {
      expect(Object.prototype.hasOwnProperty.call(out, k), `${k} must not be an own key`).toBe(false);
    }
    expect(out.ok).toBe(2);
    expect({}.role).toBeUndefined();   // nothing leaked onto Object.prototype
  });

  // compensationProfile.isOwnerOperator makes a user's own labor payroll-PAYABLE and has a dedicated
  // route restricted to ['admin','dev']. The generic PUT is open to all STAFF_ROLES, so leaving this
  // leaf writable let a `staff` account put ITSELF in the payable set — same shape as the `role`
  // escalation, through the field the privilege list deliberately waives.
  it('strips compensationProfile.isOwnerOperator in DOTTED form', () => {
    const out = stripPrivilegeFields({ 'compensationProfile.isOwnerOperator': true, 'compensationProfile.rate': 30 });
    expect(out['compensationProfile.isOwnerOperator']).toBeUndefined();
    expect(out['compensationProfile.rate']).toBe(30);
  });

  it('strips it in NESTED form while keeping the rest of the subdocument', () => {
    // Both shapes reach Mongo as the same write, so guarding one guards neither.
    const out = stripPrivilegeFields({
      compensationProfile: { isOwnerOperator: true, rate: 25, hourly: true },
    });
    expect(out.compensationProfile.isOwnerOperator).toBeUndefined();
    expect(out.compensationProfile).toEqual({ rate: 25, hourly: true });
  });

  it('does not mutate the caller\'s nested object while stripping the leaf', () => {
    const input = { compensationProfile: { isOwnerOperator: true, rate: 1 } };
    stripPrivilegeFields(input);
    expect(input.compensationProfile.isOwnerOperator).toBe(true);
  });

  it('leaves an array-valued subdocument alone rather than corrupting it', () => {
    const out = stripPrivilegeFields({ compensationProfile: [{ isOwnerOperator: true }] });
    expect(Array.isArray(out.compensationProfile)).toBe(true);
  });

  it('KEEPS employment and compensationProfile — real staff workflows edit them', () => {
    // Repair-ops access needs employment.isOnsite AND staffCapabilities.repairOps, so stripping the
    // capability already blocks the grant; listing `employment` would break the admin user-management
    // page for no additional protection.
    const out = stripPrivilegeFields({ employment: { isOnsite: true }, compensationProfile: { rate: 1 } });
    expect(out.employment).toEqual({ isOnsite: true });
    expect(out.compensationProfile).toEqual({ rate: 1 });
  });

  it('returns a NEW object and never mutates the caller\'s payload', () => {
    const input = { role: 'admin', firstName: 'A' };
    const out = stripPrivilegeFields(input);
    expect(input.role).toBe('admin');
    expect(out).not.toBe(input);
  });

  it('tolerates empty / missing input', () => {
    expect(stripPrivilegeFields()).toEqual({});
    expect(stripPrivilegeFields(null)).toEqual({});
    expect(stripPrivilegeFields({})).toEqual({});
  });
});

describe('the deleted self-service role backdoor stays deleted', () => {
  it('/api/auth/fix-role is gone', async () => {
    // POST {email, newRole} set an arbitrary role with NO session — and it was wired to a "Fix Role to
    // Admin" button on /emergency-logout, a page in middleware's publicRoutes.
    await expect(import('@/app/api/auth/fix-role/route')).rejects.toThrow();
  });
});
