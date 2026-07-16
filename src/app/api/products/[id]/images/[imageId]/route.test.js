import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  connect: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  storageSend: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/lib/database', () => ({ db: { connect: mocks.connect } }));
vi.mock('@/lib/storage', () => ({
  storageClient: { send: mocks.storageSend },
  STORAGE_BUCKET: 'test-bucket',
}));
vi.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: vi.fn((args) => ({ _cmd: 'delete', ...args })),
}));

import { PATCH } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const IMAGE_ID = 'img-1';
const adminSession = { user: { id: 'admin-1', role: 'admin' } };

const product = {
  _id: PRODUCT_ID,
  status: 'draft',
  images: [{ id: IMAGE_ID, url: 'https://storage.test/img1.jpg', key: 'img1.jpg', alt: '' }],
};

describe('PATCH /api/products/[id]/images/[imageId] — alt text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ session: adminSession, errorResponse: null });
    mocks.connect.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
    });
    mocks.findOne.mockResolvedValue(product);
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  it('updates the alt text of an image', async () => {
    const response = await PATCH(
      { json: async () => ({ alt: 'A beautiful ruby gemstone' }) },
      { params: Promise.resolve({ id: PRODUCT_ID, imageId: IMAGE_ID }) },
    );
    expect(response._status).toBe(200);
    const [filter, update] = mocks.updateOne.mock.calls[0];
    expect(filter['images.id']).toBe(IMAGE_ID);
    expect(update.$set['images.$.alt']).toBe('A beautiful ruby gemstone');
  });

  it('truncates alt text longer than 500 characters', async () => {
    const longAlt = 'a'.repeat(600);
    await PATCH(
      { json: async () => ({ alt: longAlt }) },
      { params: Promise.resolve({ id: PRODUCT_ID, imageId: IMAGE_ID }) },
    );
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set['images.$.alt'].length).toBe(500);
  });

  it('accepts an empty alt text (clears the value)', async () => {
    const response = await PATCH(
      { json: async () => ({ alt: '' }) },
      { params: Promise.resolve({ id: PRODUCT_ID, imageId: IMAGE_ID }) },
    );
    expect(response._status).toBe(200);
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set['images.$.alt']).toBe('');
  });

  it('rejects unauthenticated requests', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 401 } });
    const response = await PATCH(
      { json: async () => ({ alt: 'test' }) },
      { params: Promise.resolve({ id: PRODUCT_ID, imageId: IMAGE_ID }) },
    );
    expect(response._status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('returns 404 when image ID does not match', async () => {
    mocks.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    const response = await PATCH(
      { json: async () => ({ alt: 'new alt' }) },
      { params: Promise.resolve({ id: PRODUCT_ID, imageId: 'nonexistent-img' }) },
    );
    expect(response._status).toBe(404);
  });
});
