import { describe, it, expect } from 'vitest';
import { resolveCreatableRole, PRIVILEGED_ROLES } from './creatableRole';

/**
 * EFD-DEFECTS S6: POST /api/users took `role` from the body, and the intake client form offered
 * "Admin". What must hold: a privileged role only from an admin/dev; an unknown role refused; no
 * role means a customer; every role the app creates today still works.
 */
describe('which role a new account gets', () => {
  it('defaults to customer', () => {
    expect(resolveCreatableRole(undefined, 'admin')).toEqual({ role: 'customer' });
    expect(resolveCreatableRole('', 'staff')).toEqual({ role: 'customer' });
  });

  it('allows the roles intake and artisan onboarding create', () => {
    for (const role of ['customer', 'client', 'wholesaler', 'artisan', 'affiliate']) {
      expect(resolveCreatableRole(role, 'staff')).toEqual({ role });
    }
  });

  it('normalises case and spacing', () => {
    expect(resolveCreatableRole(' Wholesaler ', 'admin')).toEqual({ role: 'wholesaler' });
  });

  it('refuses a privileged role from anyone but an admin or dev', () => {
    for (const role of PRIVILEGED_ROLES) {
      expect(resolveCreatableRole(role, 'staff')).toMatchObject({ status: 403 });
      expect(resolveCreatableRole(role, 'superadmin')).toMatchObject({ status: 403 });
      expect(resolveCreatableRole(role, undefined)).toMatchObject({ status: 403 });
    }
  });

  it('lets an admin or dev create one on purpose', () => {
    expect(resolveCreatableRole('admin', 'admin')).toEqual({ role: 'admin' });
    expect(resolveCreatableRole('staff', 'dev')).toEqual({ role: 'staff' });
  });

  it('refuses a role the system does not know', () => {
    expect(resolveCreatableRole('owner', 'admin')).toMatchObject({ status: 400 });
    expect(resolveCreatableRole('none', 'admin')).toMatchObject({ status: 400 });
  });
});
