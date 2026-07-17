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
  storageUrl: (key) => `https://storage.test/${key}`,
}));
vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn((args) => ({ _cmd: 'put', ...args })),
  DeleteObjectCommand: vi.fn((args) => ({ _cmd: 'delete', ...args })),
}));

import { PATCH } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const adminSession = { user: { id: 'admin-1', role: 'admin' } };

const product = {
  _id: PRODUCT_ID,
  status: 'draft',
  images: [
    { id: 'img-1', url: 'https://storage.test/img1.jpg', key: 'img1.jpg' },
    { id: 'img-2', url: 'https://storage.test/img2.jpg', key: 'img2.jpg' },
    { id: 'img-3', url: 'https://storage.test/img3.jpg', key: 'img3.jpg' },
  ],
};

describe('PATCH /api/products/[id]/images — reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ session: adminSession, errorResponse: null });
    mocks.connect.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
    });
    mocks.findOne.mockResolvedValue(product);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('reorders images to match the given ID order', async () => {
    const response = await PATCH(
      { json: async () => ({ order: ['img-3', 'img-1', 'img-2'] }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._status).toBe(200);
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set.images.map((img) => img.id)).toEqual(['img-3', 'img-1', 'img-2']);
  });

  it('places images not in the order array at the end', async () => {
    const response = await PATCH(
      { json: async () => ({ order: ['img-2'] }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._status).toBe(200);
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set.images[0].id).toBe('img-2');
    expect(update.$set.images).toHaveLength(3);
  });

  it('rejects a non-array order value', async () => {
    const response = await PATCH(
      { json: async () => ({ order: 'not-an-array' }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 401 } });
    const response = await PATCH(
      { json: async () => ({ order: ['img-1'] }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('rejects an invalid product ID', async () => {
    const response = await PATCH(
      { json: async () => ({ order: ['img-1'] }) },
      { params: Promise.resolve({ id: 'bad-id' }) },
    );
    expect(response._status).toBe(400);
  });

  it('moves the second photo to the first position', async () => {
    const response = await PATCH(
      { json: async () => ({ order: ['img-2', 'img-1', 'img-3'] }) },
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    );
    expect(response._status).toBe(200);
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set.images[0].id).toBe('img-2');
    expect(update.$set.images.map((img) => img.id)).toEqual(['img-2', 'img-1', 'img-3']);
  });
});
