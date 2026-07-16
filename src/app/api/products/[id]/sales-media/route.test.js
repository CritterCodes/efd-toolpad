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

import { POST, DELETE } from './route.js';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const adminSession = { user: { id: 'admin-1', role: 'admin', name: 'Admin' } };

const makeFile = (name = 'clip.mp4', type = 'video/mp4', size = 1024) => ({
  name,
  type,
  size,
  arrayBuffer: async () => Buffer.from('fake-content'),
});

const makeFormData = (mediaType, file) => ({
  get: vi.fn((key) => {
    if (key === 'mediaType') return mediaType;
    if (key === 'file') return file;
    return null;
  }),
});

const productWithVideo = {
  _id: PRODUCT_ID,
  status: 'draft',
  productType: 'jewelry',
  salesMedia: {
    video: { id: 'vm-1', url: 'https://storage.test/video.mp4', key: 'admin/products/id/sales-media/video.mp4' },
  },
};

const productClean = { _id: PRODUCT_ID, status: 'draft', productType: 'jewelry' };

describe('POST /api/products/[id]/sales-media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ session: adminSession, errorResponse: null });
    mocks.storageSend.mockResolvedValue({});
    mocks.connect.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
    });
    mocks.findOne.mockResolvedValue(productClean);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('uploads a video file and stores it as salesMedia.video', async () => {
    const req = { formData: async () => makeFormData('video', makeFile('clip.mp4', 'video/mp4')) };
    const response = await POST(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(201);
    expect(mocks.storageSend).toHaveBeenCalledOnce();
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set['salesMedia.video']).toBeDefined();
    expect(update.$set['salesMedia.video'].url).toMatch(/storage\.test/);
  });

  it('uploads a GLB file and stores it as salesMedia.glb', async () => {
    const req = { formData: async () => makeFormData('glb', makeFile('model.glb', 'model/gltf-binary')) };
    const response = await POST(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(201);
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$set['salesMedia.glb']).toBeDefined();
  });

  it('replaces an existing video (deletes old from storage first)', async () => {
    mocks.findOne.mockResolvedValue(productWithVideo);
    const req = { formData: async () => makeFormData('video', makeFile('new.mp4', 'video/mp4')) };
    await POST(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(mocks.storageSend).toHaveBeenCalledTimes(2); // delete old + put new
  });

  it('rejects an invalid mediaType', async () => {
    const req = { formData: async () => makeFormData('model3d', makeFile()) };
    const response = await POST(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(400);
    expect(mocks.storageSend).not.toHaveBeenCalled();
  });

  it('rejects a video/* file submitted as GLB', async () => {
    const req = { formData: async () => makeFormData('glb', makeFile('not.glb.mp4', 'video/mp4')) };
    const response = await POST(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(415);
  });

  it('rejects unauthenticated requests', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 401 } });
    const response = await POST({}, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(401);
  });
});

describe('DELETE /api/products/[id]/sales-media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ session: adminSession, errorResponse: null });
    mocks.storageSend.mockResolvedValue({});
    mocks.connect.mockResolvedValue({
      collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
    });
    mocks.findOne.mockResolvedValue(productWithVideo);
    mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('deletes video from storage and unsets salesMedia.video', async () => {
    const req = { url: `http://localhost/api/products/${PRODUCT_ID}/sales-media?mediaType=video` };
    const response = await DELETE(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(200);
    expect(mocks.storageSend).toHaveBeenCalledOnce();
    const [, update] = mocks.updateOne.mock.calls[0];
    expect(update.$unset['salesMedia.video']).toBe('');
  });

  it('returns 404 when no media of that type exists', async () => {
    const req = { url: `http://localhost/api/products/${PRODUCT_ID}/sales-media?mediaType=glb` };
    const response = await DELETE(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(404);
  });

  it('rejects an invalid mediaType query param', async () => {
    const req = { url: `http://localhost/api/products/${PRODUCT_ID}/sales-media?mediaType=unknown` };
    const response = await DELETE(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 401 } });
    const req = { url: `http://localhost/api/products/${PRODUCT_ID}/sales-media?mediaType=video` };
    const response = await DELETE(req, { params: Promise.resolve({ id: PRODUCT_ID }) });
    expect(response._status).toBe(401);
  });
});
