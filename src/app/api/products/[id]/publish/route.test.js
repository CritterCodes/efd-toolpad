import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connect: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  validate: vi.fn(),
  canPublish: vi.fn(),
  notify: vi.fn(),
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

import { POST } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const request = { json: async () => ({}) };
const draft = {
  _id: PRODUCT_ID,
  productId: 'gem_1',
  title: 'Ruby',
  productType: 'gemstone',
  artisanId: 'artisan-1',
  status: 'draft',
  publishing: { visible: false },
};

describe('POST /api/products/[id]/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    mocks.canPublish.mockReturnValue(true);
    mocks.validate.mockReturnValue({ valid: true, errors: [] });
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

  it('publishes through the audited transition and returns the MongoDB 6 document', async () => {
    const published = { ...draft, status: 'published', publishing: { visible: true } };
    mocks.findOne.mockResolvedValue(draft);
    mocks.findOneAndUpdate.mockResolvedValue(published);
    const response = await POST(request, { params: Promise.resolve({ id: PRODUCT_ID }) });

    expect(response._status).toBe(200);
    expect(response._data.product).toEqual(published);
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
});
