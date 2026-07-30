import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Artisan-application review AUTHORIZATION (handoff A2).
 *
 * These routes had NO session check of any kind while `middleware.js` skips `/api/*`, which made them
 * a privilege-escalation path: the shop returns the applicationId to the applicant in its submit
 * response, and `PATCH {status:'approved'}` sets `role: 'artisan'`. So an applicant could approve
 * themselves onto the platform. GET additionally served every applicant's PII to anyone, and DELETE
 * reset roles.
 *
 * A second, byte-identical copy of the hole lived at `/api/artisan/[applicationId]` (no auth, same
 * `updateArtisanApplicationStatus` call). It was deleted rather than guarded — it had no callers in
 * either app — and the last test here is a tripwire against it coming back.
 */

let sessionUser = { userID: 'u-admin', email: 'admin@efd.test', role: 'admin' };
let sessionPresent = true;
const service = {
  getAllArtisanApplications: vi.fn(async () => [{ applicationId: 'app-1', email: 'pii@applicant.test' }]),
  getArtisanApplicationStats: vi.fn(async () => ({ total: 1 })),
  getArtisanApplicationById: vi.fn(async () => ({ applicationId: 'app-1' })),
  updateArtisanApplicationStatus: vi.fn(async () => true),
  deleteArtisanApplication: vi.fn(async () => true),
};

// Mock the real auth entry point, NOT requireRole — so the route's actual role check runs.
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionPresent ? { user: sessionUser } : null) }));
vi.mock('../../../../lib/artisanService.js', () => service);
vi.mock('../../../../../lib/artisanService.js', () => service);

const listRoute = await import('@/app/api/admin/artisans/route');
const itemRoute = await import('@/app/api/admin/artisans/[applicationId]/route');

const params = { applicationId: 'app-1' };
const req = (body) => ({ url: 'https://admin.test/api/admin/artisans/app-1', json: async () => body });
const listReq = (qs = '') => ({ url: `https://admin.test/api/admin/artisans${qs}` });

beforeEach(() => {
  vi.clearAllMocks();
  sessionPresent = true;
  sessionUser = { userID: 'u-admin', email: 'admin@efd.test', role: 'admin' };
});

describe('unauthenticated callers are refused everywhere', () => {
  it('401s on every verb and never reaches the service', async () => {
    sessionPresent = false;
    expect((await listRoute.GET(listReq())).status).toBe(401);
    expect((await itemRoute.GET(req(), { params })).status).toBe(401);
    expect((await itemRoute.PATCH(req({ status: 'approved' }), { params })).status).toBe(401);
    expect((await itemRoute.DELETE(req(), { params })).status).toBe(401);
    expect(service.updateArtisanApplicationStatus).not.toHaveBeenCalled();
    expect(service.getAllArtisanApplications).not.toHaveBeenCalled();
    expect(service.deleteArtisanApplication).not.toHaveBeenCalled();
  });
});

describe('non-staff callers are refused', () => {
  // THE ESCALATION: an applicant holding their own applicationId must not be able to approve it.
  it.each([['artisan-applicant'], ['artisan'], ['client'], ['customer'], ['wholesaler'], [undefined]])(
    'role %s cannot approve an application', async (role) => {
      sessionUser = { userID: 'u-applicant', email: 'applicant@test', role };
      const res = await itemRoute.PATCH(req({ status: 'approved' }), { params });
      expect(res.status).toBe(403);
      expect(service.updateArtisanApplicationStatus).not.toHaveBeenCalled();
    },
  );

  it('an artisan cannot read the applicant pool (PII) or delete applications', async () => {
    sessionUser = { userID: 'u-artisan', email: 'a@test', role: 'artisan' };
    expect((await listRoute.GET(listReq())).status).toBe(403);
    expect((await listRoute.GET(listReq('?action=stats'))).status).toBe(403);   // counts are business data too
    expect((await itemRoute.GET(req(), { params })).status).toBe(403);
    expect((await itemRoute.DELETE(req(), { params })).status).toBe(403);
    expect(service.getAllArtisanApplications).not.toHaveBeenCalled();
  });
});

describe('staff may review', () => {
  it.each([['admin'], ['dev'], ['staff']])('role %s can approve', async (role) => {
    sessionUser = { userID: `u-${role}`, email: `${role}@efd.test`, role };
    const res = await itemRoute.PATCH(req({ status: 'approved' }), { params });
    expect(res.status).toBe(200);
    expect(service.updateArtisanApplicationStatus).toHaveBeenCalled();
  });

  it('and can list + read + delete', async () => {
    expect((await listRoute.GET(listReq())).status).toBe(200);
    expect((await itemRoute.GET(req(), { params })).status).toBe(200);
    expect((await itemRoute.DELETE(req(), { params })).status).toBe(200);
  });
});

describe('PATCH input hardening', () => {
  it('rejects any status outside the allowlist', async () => {
    for (const status of ['banned', 'APPROVED', '', null, undefined, 0, { $ne: null }, ['approved']]) {
      vi.clearAllMocks();
      const res = await itemRoute.PATCH(req({ status }), { params });
      expect(res.status, `status ${JSON.stringify(status)} must be refused`).toBe(400);
      expect(service.updateArtisanApplicationStatus).not.toHaveBeenCalled();
    }
  });

  it('accepts exactly pending/approved/rejected', async () => {
    for (const status of ['pending', 'approved', 'rejected']) {
      expect((await itemRoute.PATCH(req({ status }), { params })).status).toBe(200);
    }
  });

  it('attributes the review to the SESSION, ignoring a body-supplied reviewedBy', async () => {
    await itemRoute.PATCH(req({ status: 'approved', reviewedBy: 'somebody-else' }), { params });
    // signature: (applicationId, status, reviewedBy, reviewNotes)
    expect(service.updateArtisanApplicationStatus).toHaveBeenCalledWith('app-1', 'approved', 'admin@efd.test', undefined);
  });

  it('falls back to userID when the session has no email', async () => {
    sessionUser = { userID: 'u-staff-9', role: 'staff' };
    await itemRoute.PATCH(req({ status: 'rejected', reviewNotes: 'not yet' }), { params });
    expect(service.updateArtisanApplicationStatus).toHaveBeenCalledWith('app-1', 'rejected', 'u-staff-9', 'not yet');
  });
});

describe('the deleted duplicate route stays deleted', () => {
  it('/api/artisan/[applicationId] does not exist (it was an unauthenticated twin of this hole)', async () => {
    await expect(import('@/app/api/artisan/[applicationId]/route')).rejects.toThrow();
  });
});
