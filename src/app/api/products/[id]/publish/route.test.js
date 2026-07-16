import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connect: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  validate: vi.fn(),
  canPublish: vi.fn(),
  notify: vi.fn(),
  loadCapability: vi.fn(),
  checkCapability: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/database', () => ({ db: { connect: mocks.connect } }));
vi.mock('@/services/products/productContract', () => ({ validateProductContract: mocks.validate }));
vi.mock('@/lib/productPermissions', () => ({
  getUserArtisanTypes: vi.fn(() => []),
  canPublishProduct: mocks.canPublish,
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: mocks.notify },
  NOTIFICATION_TYPES: { PRODUCT_PUBLISHED: 'product-published' },
}));
vi.mock('@/lib/mtoCapabilityGate', () => ({
  isRevisedMtoProduct: vi.fn((p) => Boolean(p?.designId && p?.variants?.some((v) => v.active && v.offers?.madeToOrder?.enabled))),
  isHandmadeDesign: vi.fn((d) => d?.productionMethod === 'handmade'),
  loadMtoCapabilityRecord: mocks.loadCapability,
  checkMtoCapabilityRecord: mocks.checkCapability,
}));

import { POST } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const request = { json: async () => ({}) };

// Gemstone draft — no designId, no MTO offer: not a revised MTO product
const draft = {
  _id: PRODUCT_ID,
  productId: 'gem_1',
  title: 'Ruby',
  productType: 'gemstone',
  artisanId: 'artisan-1',
  status: 'draft',
  publishing: { visible: false },
};

// Revised MTO product: Design-backed, with an active MTO variant
const mtoProduct = {
  _id: PRODUCT_ID,
  productId: 'jwl_mto_1',
  title: 'Solitaire Ring',
  productType: 'jewelry',
  designId: 'design-ring-001',
  artisanId: 'artisan-1',
  status: 'draft',
  publishing: { visible: false },
  variants: [
    { variantId: 'v1', active: true, offers: { madeToOrder: { enabled: true, leadTimeDays: 21 } } },
  ],
};

// Handmade MTO product — same shape but design returns productionMethod: 'handmade'
const handmadeProduct = {
  ...mtoProduct,
  productId: 'jwl_handmade_1',
  designId: 'design-handmade-001',
};

// Ready-to-ship product — Design-backed but no MTO offer
const rtsProduct = {
  _id: PRODUCT_ID,
  productId: 'jwl_rts_1',
  title: 'Available Ring',
  productType: 'jewelry',
  designId: 'design-ring-002',
  artisanId: 'artisan-1',
  status: 'draft',
  publishing: { visible: false },
  variants: [
    { variantId: 'v1', active: true, offers: { readyToShip: { quantity: 1, pieceIDs: ['piece-001'] } } },
  ],
};

describe('POST /api/products/[id]/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    mocks.canPublish.mockReturnValue(true);
    mocks.validate.mockReturnValue({ valid: true, errors: [] });
    mocks.checkCapability.mockReturnValue({ allowed: true });
    mocks.connect.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne, findOneAndUpdate: mocks.findOneAndUpdate }),
    });
  });

  it('is idempotent when the product is already publicly published', async () => {
    mocks.findOne.mockResolvedValue({ ...draft, status: 'published', publishing: { visible: true } });
    const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(200);
    expect(response._data.message).toBe('Product is already published');
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('rejects products that do not satisfy the storefront contract', async () => {
    mocks.findOne.mockResolvedValue(draft);
    mocks.validate.mockReturnValue({ valid: false, errors: ['at least one image is required'] });
    const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(400);
    expect(response._data.details).toEqual(['at least one image is required']);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('publishes a non-MTO product without checking the capability', async () => {
    const published = { ...draft, status: 'published', publishing: { visible: true } };
    mocks.findOne.mockResolvedValue(draft);
    mocks.findOneAndUpdate.mockResolvedValue(published);
    const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

    expect(response._status).toBe(200);
    expect(response._data.product).toEqual(published);
    expect(mocks.loadCapability).not.toHaveBeenCalled();
    expect(mocks.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      status: { $in: ['approved', 'published', 'draft'] },
      'publishing.visible': { $ne: true },
    });
    expect(mocks.findOneAndUpdate.mock.calls[0][1]).toMatchObject({
      $set: { status: 'published', isPublic: true, 'publishing.visible': true },
    });
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it('treats a concurrent successful publish as idempotent', async () => {
    const published = { ...draft, status: 'published', publishing: { visible: true } };
    mocks.findOne.mockResolvedValueOnce(draft).mockResolvedValueOnce(published);
    mocks.findOneAndUpdate.mockResolvedValue(null);

    const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(200);
    expect(response._data.message).toBe('Product is already published');
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  describe('MTO capability gate — real publish call site', () => {
    it('publishes a revised MTO product when the capability is active', async () => {
      const published = { ...mtoProduct, status: 'published', publishing: { visible: true } };
      // findOne: first call returns product, second returns design (cad_cast)
      mocks.findOne
        .mockResolvedValueOnce(mtoProduct)
        .mockResolvedValueOnce({ designID: 'design-ring-001', productionMethod: 'cad_cast' });
      mocks.loadCapability.mockResolvedValue({ key: 'mtoCheckoutCapacity', version: 1, active: true, updatedAt: new Date() });
      mocks.checkCapability.mockReturnValue({ allowed: true });
      mocks.findOneAndUpdate.mockResolvedValue(published);

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(200);
      expect(response._data.product).toEqual(published);
      expect(mocks.loadCapability).toHaveBeenCalledOnce();
      expect(mocks.checkCapability).toHaveBeenCalledOnce();
    });

    it('blocks a revised MTO product when the capability is missing (fail closed)', async () => {
      mocks.findOne
        .mockResolvedValueOnce(mtoProduct)
        .mockResolvedValueOnce({ designID: 'design-ring-001', productionMethod: 'cad_cast' });
      mocks.loadCapability.mockResolvedValue(null);
      mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability is not registered — deploy efd-shop checkout and webhook handlers first.' });

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(422);
      expect(response._data.error).toMatch(/checkout capability/i);
      expect(response._data.reason).toMatch(/not registered/i);
      expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('blocks when the capability is inactive', async () => {
      mocks.findOne
        .mockResolvedValueOnce(mtoProduct)
        .mockResolvedValueOnce({ designID: 'design-ring-001', productionMethod: 'cad_cast' });
      mocks.loadCapability.mockResolvedValue({ key: 'mtoCheckoutCapacity', version: 1, active: false, updatedAt: new Date() });
      mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability is not active.' });

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(422);
      expect(response._data.reason).toMatch(/not active/i);
      expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('blocks when the capability record is stale', async () => {
      const staleDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
      mocks.findOne
        .mockResolvedValueOnce(mtoProduct)
        .mockResolvedValueOnce({ designID: 'design-ring-001', productionMethod: 'cad_cast' });
      mocks.loadCapability.mockResolvedValue({ key: 'mtoCheckoutCapacity', version: 1, active: true, updatedAt: staleDate });
      mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability record is stale.' });

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(422);
      expect(response._data.reason).toMatch(/stale/i);
      expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('blocks when the capability version is incompatible', async () => {
      mocks.findOne
        .mockResolvedValueOnce(mtoProduct)
        .mockResolvedValueOnce({ designID: 'design-ring-001', productionMethod: 'cad_cast' });
      mocks.loadCapability.mockResolvedValue({ key: 'mtoCheckoutCapacity', version: 999, active: true, updatedAt: new Date() });
      mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability version 999 is incompatible.' });

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(422);
      expect(response._data.reason).toMatch(/incompatible/i);
      expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('bypasses the capability gate for a ready-to-ship product (no MTO offer)', async () => {
      const published = { ...rtsProduct, status: 'published', publishing: { visible: true } };
      mocks.findOne.mockResolvedValue(rtsProduct);
      mocks.findOneAndUpdate.mockResolvedValue(published);

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(200);
      expect(mocks.loadCapability).not.toHaveBeenCalled();
    });

    it('bypasses the capability gate for a handmade MTO product', async () => {
      const published = { ...handmadeProduct, status: 'published', publishing: { visible: true } };
      // findOne: product first, then handmade design
      mocks.findOne
        .mockResolvedValueOnce(handmadeProduct)
        .mockResolvedValueOnce({ designID: 'design-handmade-001', productionMethod: 'handmade' });
      mocks.findOneAndUpdate.mockResolvedValue(published);

      const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

      expect(response._status).toBe(200);
      expect(mocks.loadCapability).not.toHaveBeenCalled();
    });
  });
});
