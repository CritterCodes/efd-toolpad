import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * SAVING ONE SETTINGS TAB USED TO DELETE THE FIELDS THE OTHER TABS OWN.
 *
 * Both writers assigned whole subdocuments: POST did `financial: financial`, PUT did
 * `pricing: pricing || existing.pricing` — which falls back only when the key is absent ENTIRELY, so a
 * partial object still replaced everything. No caller sends a complete subdocument. The Custom Design
 * Pricing tab posts five financial keys, so saving it dropped `rushMultiplier` (that has been happening
 * in production) and, once centre stones got their own markup, would drop `centerstoneMarkup` too.
 *
 * Nothing errors and nothing looks wrong. The next quote simply charges a different number, because a
 * missing centerstoneMarkup silently falls back to the full 2.5× COG markup — on a natural diamond that
 * is the difference between a $5,200 stone line and a $10,000 one.
 *
 * Same shape as the staffCapabilities wipe: a write that looks like an update but is a replace.
 */

const EXISTING = {
  _id: 'repair_task_admin_settings',
  version: 4,
  financial: {
    cogMarkup: 2.5,
    designFeeMarkup: 1.5,
    defaultDesignerFee: 0,
    commissionPercentage: 0.1,
    targetMarginFloor: 0.45,
    // The two that no UI form posts back — the ones that were being lost.
    centerstoneMarkup: 1.3,
    rushMultiplier: 2,
  },
  pricing: { taxRate: 0.0925, deliveryFee: 25, wholesaleDiscount: 0.2 },
  business: { storeName: 'EFD', timezone: 'America/Chicago' },
  // The PUT gate: a stored hash plus an unexpired window. verifySecurityCode is mocked truthy, so this
  // fixture only has to get us past the expiry check to reach the merge under test.
  security: { securityCode: 'stored-hash', expiresAt: '2999-01-01T00:00:00.000Z' },
};

// What the Custom Design Pricing tab actually sends (see CustomDesignPricingTab.handleSave).
const TAB_POSTS = {
  cogMarkup: 2.5,
  designFeeMarkup: 1.5,
  defaultDesignerFee: 0,
  commissionPercentage: 0.1,
  targetMarginFloor: 0.45,
};

let written;

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { role: 'admin', email: 'a@efd.com' } })) }));
vi.mock('@/utils/encryption', () => ({
  hashSecurityCode: vi.fn(), verifySecurityCode: vi.fn(async () => true),
  createAuditLogEntry: vi.fn(async () => {}), maskSensitiveData: vi.fn((x) => x),
}));
vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => {}),
    _instance: {
      collection: () => ({
        findOne: async () => structuredClone(EXISTING),
        updateOne: async (_f, ops) => { written = ops.$set; return { modifiedCount: 1 }; },
        replaceOne: async (_f, doc) => { written = doc; return { modifiedCount: 1 }; },
        insertOne: async () => ({}),
      }),
    },
  },
}));

const req = (body) => ({ json: async () => body, headers: { get: () => null } });

beforeEach(() => { written = undefined; });

describe('POST /api/admin/settings preserves financial keys the caller did not send', () => {
  it('keeps centerstoneMarkup and rushMultiplier when the pricing tab saves', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ financial: TAB_POSTS }));
    expect(res.status).toBe(200);
    expect(written.financial.centerstoneMarkup).toBe(1.3);
    expect(written.financial.rushMultiplier).toBe(2);
  });

  it('still applies the values that WERE sent', async () => {
    const { POST } = await import('./route');
    await POST(req({ financial: { ...TAB_POSTS, cogMarkup: 3 } }));
    expect(written.financial.cogMarkup).toBe(3);
    expect(written.financial.centerstoneMarkup).toBe(1.3);   // untouched
  });

  it('rejects a centre-stone markup that would price below cost', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ financial: { centerstoneMarkup: 0.13 } }));
    expect(res.status).toBe(400);
    expect(written).toBeUndefined();                          // nothing written on reject
  });

  it('rejects a centre-stone markup above the 10x bound', async () => {
    const { POST } = await import('./route');
    expect((await POST(req({ financial: { centerstoneMarkup: 25 } }))).status).toBe(400);
  });

  it('accepts the value the owner actually uses', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ financial: { centerstoneMarkup: 1.3 } }));
    expect(res.status).toBe(200);
    expect(written.financial.centerstoneMarkup).toBe(1.3);
  });
});

describe('PUT /api/admin/settings merges each subdocument', () => {
  it('a partial pricing save keeps the other pricing keys', async () => {
    const { PUT } = await import('./route');
    const res = await PUT(req({ pricing: { taxRate: 0.08 }, securityCode: '1234' }));
    expect(res.status).toBe(200);
    expect(written.pricing.taxRate).toBe(0.08);
    expect(written.pricing.deliveryFee).toBe(25);
    expect(written.pricing.wholesaleDiscount).toBe(0.2);
  });

  it('a pricing-only save leaves financial and business intact', async () => {
    const { PUT } = await import('./route');
    await PUT(req({ pricing: { taxRate: 0.08 }, securityCode: '1234' }));
    expect(written.financial.centerstoneMarkup).toBe(1.3);
    expect(written.business.storeName).toBe('EFD');
  });
});
