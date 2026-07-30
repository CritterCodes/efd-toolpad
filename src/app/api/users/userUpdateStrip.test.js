import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `UserController.updateUser` — the `PUT /api/users?query=` path — must strip privilege fields.
 *
 * WHY A SEPARATE FILE: `userRouteAuth.test.js` mocks the whole controller to test the route's authz, so
 * it cannot see this. Deleting the strip here passed all 31 users tests — the same blind spot that let
 * the two siblings drift apart in the first place (one stripped, one didn't, leaving a staff→admin
 * self-promotion open). Route-level mocks and service-level logic need separate tests.
 */

const svc = {
  updateUser: vi.fn(async (query, data) => ({ userID: 'u-1', ...data })),
  getUserByQuery: vi.fn(async () => ({ userID: 'u-1', role: 'staff' })),
};

vi.mock('./service', () => ({ default: svc }));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn(async () => ({})) },
  NOTIFICATION_TYPES: {},
  CHANNELS: { IN_APP: 'inApp', EMAIL: 'email' },
}));

const UserController = (await import('./controller')).default;

const req = (body, query = 'u-1') => ({
  url: `https://admin.test/api/users?query=${query}`,
  json: async () => body,
});

beforeEach(() => vi.clearAllMocks());

describe('privilege fields cannot be set through PUT /api/users?query=', () => {
  it('strips role — a staff caller cannot promote itself to admin here', async () => {
    // STAFF_ROLES includes `staff`, whose ROLE_PERMISSIONS deny `adminSettings` — the very check
    // /api/users/create-admin uses to refuse a staff-issued admin grant. Unstripped, this endpoint was
    // the way around that.
    await UserController.updateUser(req({ role: 'admin', firstName: 'Mal' }));
    expect(svc.updateUser).toHaveBeenCalled();
    const [, patch] = svc.updateUser.mock.calls[0];
    expect(patch.role).toBeUndefined();
    expect(patch.firstName).toBe('Mal');
  });

  it('strips every privilege field, including dotted subdocument targets', async () => {
    await UserController.updateUser(req({
      password: 'x', status: 'verified', emailVerified: true, mustChangePassword: false,
      staffCapabilities: { repairOps: true },
      'staffCapabilities.closeoutBilling': true,
      resetToken: 't',
      firstName: 'Legit',
    }));
    const [, patch] = svc.updateUser.mock.calls[0];
    for (const f of ['password', 'status', 'emailVerified', 'mustChangePassword', 'staffCapabilities',
                     'staffCapabilities.closeoutBilling', 'resetToken']) {
      expect(patch[f], `${f} must be stripped`).toBeUndefined();
    }
    expect(patch.firstName).toBe('Legit');
  });

  it('still applies ordinary field updates', async () => {
    await UserController.updateUser(req({ firstName: 'A', lastName: 'B', phoneNumber: '555' }));
    const [, patch] = svc.updateUser.mock.calls[0];
    expect(patch).toMatchObject({ firstName: 'A', lastName: 'B', phoneNumber: '555' });
  });
});
