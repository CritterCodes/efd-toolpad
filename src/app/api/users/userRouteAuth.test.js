import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `/api/users` + `/api/users/[userID]` AUTHORIZATION.
 *
 * These were UNAUTHENTICATED PRIVILEGE ESCALATION TO ADMIN — found by a 5th-round review after two
 * commits had already claimed to close the app's role-escalation holes. Both PUT handlers reached a raw
 * Mongo `$set` that accepted `role`, and neither checked a session, so:
 *
 *     PUT /api/users/<anyone>  {"role":"admin"}      → 200, role granted
 *
 * Strictly worse than the artisan-application hole that prompted the audit (that one granted only
 * `artisan`), and it defeated every other gate in the app — an escalated account then passes them
 * honestly. GET leaked user records and DELETE removed accounts, both anonymously.
 *
 * The lesson these tests encode: guarding the routes an audit NAMES is not the same as guarding every
 * route that can reach the privileged operation.
 */

let sessionUser = { userID: 'u-admin', email: 'admin@efd.test', role: 'admin' };
let sessionPresent = true;

const svc = {
  getUserById: vi.fn(async () => ({ userID: 'victim-1', role: 'client' })),
  updateUserById: vi.fn(async (id, data) => ({ userID: id, ...data })),
  deleteUser: vi.fn(async () => ({ deletedCount: 1 })),
};
const controller = {
  createUser: vi.fn(async () => Response.json({ success: true })),
  getUserByQuery: vi.fn(async () => Response.json({ success: true })),
  getUsersByRole: vi.fn(async () => Response.json({ success: true })),
  getAllUsers: vi.fn(async () => Response.json({ success: true })),
  updateUser: vi.fn(async () => Response.json({ success: true })),
  deleteUser: vi.fn(async () => Response.json({ success: true })),
};

vi.mock('@/lib/auth', () => ({ auth: async () => (sessionPresent ? { user: sessionUser } : null) }));
// Path is relative to THIS file: the route imports '../service.js' from `[userID]/`, which resolves to
// the same module as './service.js' from here (src/app/api/users/).
vi.mock('./service.js', () => ({ default: svc }));
vi.mock('./controller', () => ({ default: controller }));

const item = await import('@/app/api/users/[userID]/route');
const coll = await import('@/app/api/users/route');

const params = Promise.resolve({ userID: 'victim-1' });
const req = (body) => ({ url: 'https://admin.test/api/users/victim-1', json: async () => body });
const collReq = (qs = '') => ({ url: `https://admin.test/api/users${qs}`, json: async () => ({}) });

beforeEach(() => {
  vi.clearAllMocks();
  sessionPresent = true;
  sessionUser = { userID: 'u-admin', email: 'admin@efd.test', role: 'admin' };
});

describe('anonymous callers cannot touch users at all', () => {
  it('401s on every verb of both routes, and never reaches the service', async () => {
    sessionPresent = false;
    expect((await item.GET(req(), { params })).status).toBe(401);
    expect((await item.PUT(req({ role: 'admin' }), { params })).status).toBe(401);
    expect((await item.DELETE(req(), { params })).status).toBe(401);
    expect((await coll.GET(collReq())).status).toBe(401);
    expect((await coll.POST(collReq())).status).toBe(401);
    expect((await coll.PUT(collReq('?query=victim-1'))).status).toBe(401);
    expect((await coll.DELETE(collReq('?query=victim-1'))).status).toBe(401);
    expect(svc.updateUserById).not.toHaveBeenCalled();
    expect(svc.deleteUser).not.toHaveBeenCalled();
    expect(controller.updateUser).not.toHaveBeenCalled();
  });
});

describe('THE ESCALATION: nobody can grant themselves a role here', () => {
  it.each([['client'], ['customer'], ['artisan'], ['artisan-applicant'], ['wholesaler'], ['affiliate'], [undefined]])(
    'role %s is refused on PUT', async (role) => {
      sessionUser = { userID: 'u-mal', email: 'mal@test', role };
      expect((await item.PUT(req({ role: 'admin' }), { params })).status).toBe(403);
      expect((await coll.PUT(collReq('?query=victim-1'))).status).toBe(403);
      expect(svc.updateUserById).not.toHaveBeenCalled();
    },
  );

  it('even STAFF cannot set role through this generic endpoint', async () => {
    await item.PUT(req({ role: 'admin', firstName: 'Legit' }), { params });
    expect(svc.updateUserById).toHaveBeenCalled();
    const [, patch] = svc.updateUserById.mock.calls[0];
    expect(patch.role).toBeUndefined();          // stripped — granting admin has its own guarded route
    expect(patch.firstName).toBe('Legit');       // ordinary fields still update
  });

  it('strips every privilege field, not just role', async () => {
    await item.PUT(req({
      password: 'x', status: 'verified', emailVerified: true,
      staffCapabilities: { repairOps: true }, mustChangePassword: false,
      compensationProfile: { rate: 25 },
    }), { params });
    const [, patch] = svc.updateUserById.mock.calls[0];
    for (const f of ['password', 'status', 'emailVerified', 'staffCapabilities', 'mustChangePassword']) {
      expect(patch[f], `${f} must be stripped`).toBeUndefined();
    }
    expect(patch.compensationProfile).toEqual({ rate: 25 });   // the real staff use case still works
  });
});

describe('staff writes and authenticated reads', () => {
  it.each([['admin'], ['dev'], ['staff'], ['superadmin']])('%s may write', async (role) => {
    sessionUser = { userID: `u-${role}`, role };
    expect((await item.PUT(req({ firstName: 'A' }), { params })).status).toBe(200);
    expect((await item.DELETE(req(), { params })).status).toBe(200);
    expect((await coll.POST(collReq())).status).toBe(200);
  });

  // Reads stay open to any signed-in user ON PURPOSE: ?role=artisan feeds the collaborator pickers
  // artisans use in the drops design editor. Staff-gating reads would break their own surfaces.
  it('an artisan may still READ the user list (their collaborator picker depends on it)', async () => {
    sessionUser = { userID: 'u-artisan', role: 'artisan' };
    expect((await coll.GET(collReq('?role=artisan'))).status).toBe(200);
    expect((await item.GET(req(), { params })).status).toBe(200);
  });

  it('but an artisan may NOT create or delete users', async () => {
    sessionUser = { userID: 'u-artisan', role: 'artisan' };
    expect((await coll.POST(collReq())).status).toBe(403);
    expect((await coll.DELETE(collReq('?query=x'))).status).toBe(403);
    expect((await item.DELETE(req(), { params })).status).toBe(403);
  });
});

describe('the deleted unauthenticated applicant-pool route stays deleted', () => {
  it('/api/artisan (parent) is gone — it served all applicant PII anonymously', async () => {
    // The prior commit deleted the [applicationId] CHILD and left this parent, which called the same
    // getAllArtisanApplications with no session. Deleting the child alone left the leak wide open.
    await expect(import('@/app/api/artisan/route')).rejects.toThrow();
  });
});
