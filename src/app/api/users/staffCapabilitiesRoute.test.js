import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeCapabilities, CAPABILITY_KEYS } from './staffCapabilityRules';

/**
 * The capability grant path.
 *
 * `staffCapabilities` is in USER_PRIVILEGE_FIELDS, so the generic PUT /api/users/[userID] strips it.
 * That strip closed a real escalation, but it also meant the admin capability switches had nowhere to
 * write: saving returned 200, said "saved", and the refetch snapped every switch back. There was no
 * working way to promote a jeweler to QC. This route is the escape hatch, so it is also the only thing
 * standing between an admin request and the field every repair gate reads.
 *
 * The ROUTE is tested, not just the rules — the first cut tested only normalizeCapabilities and shipped
 * a route that 404'd on 100% of real traffic, because it matched `{ userID }` while the artisan list
 * navigates by Mongo `_id`. That defect lived entirely in the query filter, which pure-rule tests can't
 * see. Mocking @/lib/apiAuth is the same pattern closeoutClaimOrdering.test.js uses.
 */

const updateOne = vi.fn();
const requireRole = vi.fn();

vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ updateOne }) }) },
}));
vi.mock('@/lib/apiAuth', () => ({ requireRole: (...a) => requireRole(...a) }));

const { PATCH } = await import('./[userID]/staff-capabilities/route');

const OBJECT_ID = '507f1f77bcf86cd799439011'; // 24-hex, what ArtisanTable actually navigates with

const patch = (body, userID = OBJECT_ID) => PATCH(
  new Request('http://localhost/x', { method: 'PATCH', body: JSON.stringify(body) }),
  { params: Promise.resolve({ userID }) }
);

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ errorResponse: null });
  updateOne.mockResolvedValue({ matchedCount: 1 });
});

describe('PATCH staff-capabilities — the query filter', () => {
  it('matches an artisan navigated to by Mongo _id — the 404-everything bug', async () => {
    const res = await patch({ staffCapabilities: { repairOps: true } });
    expect(res.status).toBe(200);

    const [filter] = updateOne.mock.calls[0];
    // A bare { userID: '<24-hex>' } matches nothing: an ObjectId is never a userID value.
    expect(filter).not.toEqual({ userID: OBJECT_ID });
    expect(filter.$or).toEqual(expect.arrayContaining([{ userID: OBJECT_ID }]));
  });

  it('still matches when the param is a plain userID', async () => {
    await patch({ staffCapabilities: { repairOps: true } }, 'user-123');
    expect(updateOne.mock.calls[0][0]).toEqual({ userID: 'user-123' });
  });

  it('404s when no user matched', async () => {
    updateOne.mockResolvedValue({ matchedCount: 0 });
    const res = await patch({ staffCapabilities: { repairOps: true } });
    expect(res.status).toBe(404);
  });
});

describe('PATCH staff-capabilities — auth and input', () => {
  it('refuses when the role gate rejects', async () => {
    const denied = new Response(null, { status: 403 });
    requireRole.mockResolvedValue({ errorResponse: denied });

    const res = await patch({ staffCapabilities: { repairOps: true } });
    expect(res).toBe(denied);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('gates on admin/dev only — not the wider STAFF_ROLES', async () => {
    await patch({ staffCapabilities: { repairOps: true } });
    expect(requireRole).toHaveBeenCalledWith(['admin', 'dev']);
  });

  it('rejects a non-object body without writing', async () => {
    for (const bad of [{ staffCapabilities: null }, { staffCapabilities: [] }, { staffCapabilities: 'x' }, {}]) {
      updateOne.mockClear();
      const res = await patch(bad);
      expect(res.status).toBe(400);
      expect(updateOne).not.toHaveBeenCalled();
    }
  });

  it('rejects an unknown key with 400 rather than writing a partial grant', async () => {
    const res = await patch({ staffCapabilities: { repairOps: true, wat: true } });
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('writes only the capability document and a timestamp', async () => {
    await patch({ staffCapabilities: { repairOps: true, qualityControl: true } });
    const [, update] = updateOne.mock.calls[0];

    expect(Object.keys(update)).toEqual(['$set']);
    expect(update.$set.staffCapabilities).toEqual({ repairOps: true, qualityControl: true });
    expect(update.$set.updatedAt).toBeInstanceOf(Date);
    // No other field may ride along on a privileged write.
    expect(Object.keys(update.$set).sort()).toEqual(['staffCapabilities', 'updatedAt']);
  });

  it('tells the caller the change only lands at next sign-in', async () => {
    const res = await patch({ staffCapabilities: { repairOps: true } });
    expect(await res.json()).toMatchObject({ appliesOnNextLogin: true });
  });
});

describe('normalizeCapabilities', () => {
  it('keeps the granted capabilities', () => {
    expect(normalizeCapabilities({ repairOps: true, qualityControl: true }))
      .toEqual({ repairOps: true, qualityControl: true });
  });

  it('RETAINS sub-capabilities when repairOps is off — they are a record, not an active grant', () => {
    // Collapsing to {} here was the same silent-loss bug as the off-site wipe, except it persisted:
    // the UI leaves sub-switches visibly ticked while disabled, so unticking Repair Ops to suspend
    // access would have destroyed Bench Work and Quality Control with no warning. The gates already
    // ignore these without repairOps, so keeping them grants nothing.
    expect(normalizeCapabilities({ qualityControl: true, closeoutBilling: true }))
      .toEqual({ qualityControl: true, closeoutBilling: true });
    expect(normalizeCapabilities({ repairOps: false, benchWork: true })).toEqual({ benchWork: true });
  });

  it('REJECTS an unknown key rather than ignoring it', () => {
    expect(() => normalizeCapabilities({ repairOps: true, qualityControll: true }))
      .toThrow(/Unknown capability: qualityControll/);
  });

  it('cannot be used to write arbitrary fields into the user document', () => {
    expect(() => normalizeCapabilities({ role: 'admin' })).toThrow(/Unknown capability: role/);
    expect(() => normalizeCapabilities({ password: 'x' })).toThrow(/Unknown capability: password/);
    expect(() => normalizeCapabilities(JSON.parse('{"__proto__":{"x":1}}'))).toThrow(/Unknown capability/);
  });

  it('stores only true — never false or truthy junk', () => {
    const out = normalizeCapabilities({
      repairOps: true, receiving: false, benchWork: 'yes', parts: 1, qualityControl: null,
    });
    expect(out).toEqual({ repairOps: true });
    for (const value of Object.values(out)) expect(value).toBe(true);
  });

  it('revokes everything with an empty object', () => {
    expect(normalizeCapabilities({})).toEqual({});
  });

  it('covers exactly the capabilities the gates read', () => {
    // If a seventh gate key is ever added, it must be listed here or it can never be granted.
    expect([...CAPABILITY_KEYS].sort()).toEqual(
      ['benchWork', 'closeoutBilling', 'parts', 'qualityControl', 'receiving', 'repairOps']
    );
  });
});
